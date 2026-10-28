import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib
import os
from datetime import datetime

MIN_REAL_SAMPLES = 5        # minimum real records before training
RETRAIN_EVERY = 5           # retrain after every 5 new records

class QueueMLModels:
    def __init__(self):
        self.models_dir = os.path.join(os.path.dirname(__file__), 'saved_models')
        os.makedirs(self.models_dir, exist_ok=True)

        self.waiting_time_model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
        self.queue_length_model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
        self.no_show_model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
        self.peak_hours_model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)

        self.label_encoders = {}
        self.is_trained = False
        self.total_records = 0
        self.buffer = []
        self.model_scores = {}

        self._load_all_models()

    # ─────────────────────────────────────────────────────
    # AUTO TRAIN — CALLED WHEN USER JOINS QUEUE
    # ─────────────────────────────────────────────────────
    def on_user_joined(self, queue_record):
        self.buffer.append(queue_record)
        print(f"[ML] Buffer: {len(self.buffer)}/{RETRAIN_EVERY} | Total trained: {self.total_records}")

        if len(self.buffer) >= RETRAIN_EVERY:
            print("[ML] Threshold reached — starting auto training...")
            self._auto_train()

        return {
            "buffered": True,
            "buffer_size": len(self.buffer),
            "trains_at": RETRAIN_EVERY,
            "total_records": self.total_records
        }

    # ─────────────────────────────────────────────────────
    # INTERNAL AUTO TRAIN
    # ─────────────────────────────────────────────────────
    def _auto_train(self):
        if len(self.buffer) < MIN_REAL_SAMPLES:
            print(f"[ML] Not enough data. Need {MIN_REAL_SAMPLES}, have {len(self.buffer)}")
            return

        data = self.buffer.copy()
        trained_any = False

        try:
            r1 = self.train_waiting_time_model(data)
            r2 = self.train_queue_length_model(data)
            r3 = self.train_no_show_model(data)
            r4 = self.train_peak_hours_model(data)

            if any(r.get('score') is not None for r in [r1, r2, r3, r4]):
                trained_any = True

            if trained_any:
                self.is_trained = True
                self.total_records += len(self.buffer)
                self._record_scores(r1, r2, r3, r4)
                self.buffer = []
                self._save_metadata()
                print(f"[ML] ✓ Auto training complete on REAL data. Total: {self.total_records}")
            else:
                print("[ML] No models trained — waiting for more real data")
                self.buffer = []

        except Exception as e:
            print(f"[ML] Auto training failed: {e}")

    # ─────────────────────────────────────────────────────
    # FEATURE PREPARATION
    # ─────────────────────────────────────────────────────
    def prepare_features(self, df, fit_encoders=False):
        df = df.copy()

        if 'joinedAt' in df.columns:
            df['joinedAt'] = pd.to_datetime(df['joinedAt'])
            df['dayOfWeek']  = df['joinedAt'].dt.dayofweek
            df['hourOfDay']  = df['joinedAt'].dt.hour
            df['month']      = df['joinedAt'].dt.month
            df['dayOfMonth'] = df['joinedAt'].dt.day

        if 'service' in df.columns:
            if fit_encoders or 'service' not in self.label_encoders:
                self.label_encoders['service'] = LabelEncoder()
                df['service_encoded'] = self.label_encoders['service'].fit_transform(df['service'].astype(str))
            else:
                encoder = self.label_encoders['service']
                known = set(encoder.classes_)
                df['service_encoded'] = df['service'].apply(
                    lambda v: int(encoder.transform([v])[0]) if v in known else -1
                )

        return df

    # ─────────────────────────────────────────────────────
    # TRAIN INDIVIDUAL MODELS
    # ─────────────────────────────────────────────────────
    def train_waiting_time_model(self, data):
        df = pd.DataFrame(data)
        df = self.prepare_features(df, fit_encoders=True)

        feature_cols = ['dayOfWeek', 'hourOfDay', 'month', 'dayOfMonth', 'service_encoded', 'positionInQueue']
        feature_cols = [c for c in feature_cols if c in df.columns]

        X = df[feature_cols].fillna(0)
        y = df['waitingTime'].fillna(0) if 'waitingTime' in df.columns else pd.Series([0]*len(df))

        if len(X) < MIN_REAL_SAMPLES:
            print("[ML] Not enough real data yet, skipping waiting_time model.")
            return {'score': None, 'message': 'Waiting for real data'}

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        self.waiting_time_model.fit(X_train, y_train)

        joblib.dump(self.waiting_time_model, os.path.join(self.models_dir, 'waiting_time_model.pkl'))
        joblib.dump(self.label_encoders,     os.path.join(self.models_dir, 'label_encoders.pkl'))

        score = self.waiting_time_model.score(X_test, y_test)
        return {'score': round(score, 4)}

    def train_queue_length_model(self, data):
        df = pd.DataFrame(data)
        df = self.prepare_features(df, fit_encoders=True)

        feature_cols = ['dayOfWeek', 'hourOfDay', 'month', 'dayOfMonth', 'service_encoded']
        feature_cols = [c for c in feature_cols if c in df.columns]

        X = df[feature_cols].fillna(0)

        if 'status' in df.columns:
            df['queueLength'] = df.groupby(['dayOfWeek', 'hourOfDay'])['status'].transform(
                lambda x: (x == 'Waiting').sum()
            )
        else:
            df['queueLength'] = df.get('totalInQueue', pd.Series([0]*len(df)))

        y = df['queueLength'].fillna(0)

        if len(X) < MIN_REAL_SAMPLES:
            print("[ML] Not enough real data yet, skipping queue_length model.")
            return {'score': None, 'message': 'Waiting for real data'}

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        self.queue_length_model.fit(X_train, y_train)

        joblib.dump(self.queue_length_model, os.path.join(self.models_dir, 'queue_length_model.pkl'))

        score = self.queue_length_model.score(X_test, y_test)
        return {'score': round(score, 4)}

    def train_no_show_model(self, data):
        df = pd.DataFrame(data)
        df = self.prepare_features(df, fit_encoders=True)

        feature_cols = ['dayOfWeek', 'hourOfDay', 'month', 'dayOfMonth', 'service_encoded', 'positionInQueue']
        feature_cols = [c for c in feature_cols if c in df.columns]

        X = df[feature_cols].fillna(0)
        y = df['noShow'].fillna(False).astype(int) if 'noShow' in df.columns else pd.Series([0]*len(df))

        if len(X) < MIN_REAL_SAMPLES or len(set(y)) < 2:
            print("[ML] Not enough real data yet, skipping no_show model.")
            return {'score': None, 'message': 'Waiting for real data'}

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        self.no_show_model.fit(X_train, y_train)

        joblib.dump(self.no_show_model, os.path.join(self.models_dir, 'no_show_model.pkl'))

        score = self.no_show_model.score(X_test, y_test)
        return {'score': round(score, 4)}

    def train_peak_hours_model(self, data):
        df = pd.DataFrame(data)
        df = self.prepare_features(df, fit_encoders=True)

        if 'status' in df.columns:
            df['queueDensity'] = df.groupby(['dayOfWeek', 'hourOfDay'])['status'].transform('count')
        else:
            df['queueDensity'] = df.get('totalInQueue', pd.Series([0]*len(df)))

        feature_cols = ['dayOfWeek', 'hourOfDay', 'month', 'dayOfMonth', 'service_encoded']
        feature_cols = [c for c in feature_cols if c in df.columns]

        X = df[feature_cols].fillna(0)
        y = df['queueDensity'].fillna(0)

        if len(X) < MIN_REAL_SAMPLES:
            print("[ML] Not enough real data yet, skipping peak_hours model.")
            return {'score': None, 'message': 'Waiting for real data'}

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        self.peak_hours_model.fit(X_train, y_train)

        joblib.dump(self.peak_hours_model, os.path.join(self.models_dir, 'peak_hours_model.pkl'))

        score = self.peak_hours_model.score(X_test, y_test)
        return {'score': round(score, 4)}

    def _record_scores(self, *train_results):
        mapping = {
            'waitingTime': train_results[0].get('score') if train_results[0] else None,
            'queueLength': train_results[1].get('score') if train_results[1] else None,
            'noShow': train_results[2].get('score') if train_results[2] else None,
            'peakHours': train_results[3].get('score') if train_results[3] else None
        }
        for key, value in mapping.items():
            if value is not None:
                self.model_scores[key] = value

    def record_training_results(self, results):
        if not isinstance(results, dict):
            return
        for key in ['waitingTime', 'queueLength', 'noShow', 'peakHours']:
            score = (results.get(key) or {}).get('score')
            if score is not None:
                self.model_scores[key] = score
        self._save_metadata()
    def predict_waiting_time(self, features):
        try:
            self._load_model_if_needed('waiting_time')
            df = pd.DataFrame([features])
            df = self.prepare_features(df)
            cols = [c for c in ['dayOfWeek', 'hourOfDay', 'month', 'dayOfMonth', 'service_encoded', 'positionInQueue'] if c in df.columns]
            return max(0, round(float(self.waiting_time_model.predict(df[cols].fillna(0))[0]), 2))
        except Exception as e:
            print(f"[ML] predict_waiting_time error: {e}")
            return features.get('positionInQueue', 0) * 2

    def predict_queue_length(self, features):
        try:
            self._load_model_if_needed('queue_length')
            df = pd.DataFrame([features])
            df = self.prepare_features(df)
            cols = [c for c in ['dayOfWeek', 'hourOfDay', 'month', 'dayOfMonth', 'service_encoded'] if c in df.columns]
            return max(0, round(float(self.queue_length_model.predict(df[cols].fillna(0))[0])))
        except Exception as e:
            print(f"[ML] predict_queue_length error: {e}")
            return 10

    def predict_no_show_probability(self, features):
        try:
            self._load_model_if_needed('no_show')
            df = pd.DataFrame([features])
            df = self.prepare_features(df)
            cols = [c for c in ['dayOfWeek', 'hourOfDay', 'month', 'dayOfMonth', 'service_encoded', 'positionInQueue'] if c in df.columns]
            prob = self.no_show_model.predict_proba(df[cols].fillna(0))[0][1]
            return round(float(prob), 3)
        except Exception as e:
            print(f"[ML] predict_no_show error: {e}")
            return 0.15

    def predict_peak_hours(self, features):
        try:
            self._load_model_if_needed('peak_hours')
            df = pd.DataFrame([features])
            df = self.prepare_features(df)
            cols = [c for c in ['dayOfWeek', 'hourOfDay', 'month', 'dayOfMonth', 'service_encoded'] if c in df.columns]
            return max(0, round(float(self.peak_hours_model.predict(df[cols].fillna(0))[0]), 2))
        except Exception as e:
            print(f"[ML] predict_peak_hours error: {e}")
            return 20

    def suggest_best_time(self, service, day_of_week=None):
        try:
            target_day = day_of_week if day_of_week is not None else datetime.now().weekday()
            best_times = []

            for hour in range(9, 18):
                features = {
                    'service': service,
                    'dayOfWeek': target_day,
                    'hourOfDay': hour,
                    'month': datetime.now().month,
                    'dayOfMonth': datetime.now().day,
                    'positionInQueue': 1
                }
                q = self.predict_queue_length(features)
                w = self.predict_waiting_time(features)
                best_times.append({'hour': hour, 'queueLength': q, 'waitingTime': w, 'score': q * 0.6 + w * 0.4})

            best_times.sort(key=lambda x: x['score'])
            return [{'hour': t['hour'], 'queueLength': t['queueLength'], 'waitingTime': t['waitingTime']}
                    for t in best_times[:3]]
        except Exception as e:
            return [
                {'hour': 10, 'queueLength': 5, 'waitingTime': 10},
                {'hour': 14, 'queueLength': 7, 'waitingTime': 14},
                {'hour': 16, 'queueLength': 6, 'waitingTime': 12}
            ]

    # ─────────────────────────────────────────────────────
    # SAVE / LOAD HELPERS
    # ─────────────────────────────────────────────────────
    def _load_model_if_needed(self, model_type):
        paths = {
            'waiting_time': ('waiting_time_model.pkl', 'waiting_time_model'),
            'queue_length': ('queue_length_model.pkl', 'queue_length_model'),
            'no_show':      ('no_show_model.pkl',      'no_show_model'),
            'peak_hours':   ('peak_hours_model.pkl',   'peak_hours_model'),
        }
        filename, attr = paths[model_type]
        model = getattr(self, attr)
        if not hasattr(model, 'feature_importances_'):
            path = os.path.join(self.models_dir, filename)
            if os.path.exists(path):
                setattr(self, attr, joblib.load(path))
                encoders_path = os.path.join(self.models_dir, 'label_encoders.pkl')
                if os.path.exists(encoders_path):
                    self.label_encoders = joblib.load(encoders_path)

    def _load_all_models(self):
        for model_type in ['waiting_time', 'queue_length', 'no_show', 'peak_hours']:
            self._load_model_if_needed(model_type)

        meta_path = os.path.join(self.models_dir, 'metadata.pkl')
        if os.path.exists(meta_path):
            meta = joblib.load(meta_path)
            self.is_trained    = meta.get('is_trained', False)
            self.total_records = meta.get('total_records', 0)
            self.model_scores  = meta.get('model_scores', {})
            print(f"[ML] Models loaded. Trained on {self.total_records} records.")

    def _save_metadata(self):
        joblib.dump(
            {
                'is_trained': self.is_trained,
                'total_records': self.total_records,
                'model_scores': getattr(self, 'model_scores', {})
            },
            os.path.join(self.models_dir, 'metadata.pkl')
        )

    # ─────────────────────────────────────────────────────
    # PREDICTIONS
    # ─────────────────────────────────────────────────────