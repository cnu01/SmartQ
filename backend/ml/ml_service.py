import sys
import time
import os

from flask import Flask, request, jsonify
from flask_cors import CORS

STARTUP_TS = time.time()
print("[ML] Booting service. Loading ML dependencies (first run can take up to 60s)...", flush=True)
from models import QueueMLModels
print(f"[ML] ML dependencies loaded in {time.time() - STARTUP_TS:.1f}s", flush=True)

app = Flask(__name__)
default_origins = [
    "http://localhost:3000",
    "https://smart-q.vercel.app",
    "https://smartq-system.vercel.app"
]
configured_origins = [
    origin.strip()
    for origin in str(os.environ.get("FRONTEND_ORIGINS", "")).split(",")
    if origin.strip()
]
# Browser + Netlify preview URLs; set FRONTEND_ORIGINS in Render for explicit allowlist.
cors_origins = configured_origins if configured_origins else default_origins
CORS(app, origins=cors_origins, supports_credentials=True)

ml_models = QueueMLModels()

# ─────────────────────────────────────────────────────
# AUTO TRAIN — your Node.js calls this on every queue join
# ─────────────────────────────────────────────────────
@app.route('/queue/joined', methods=['POST'])
def user_joined():
    """
    Called automatically from Node.js when a user joins.
    Buffers data and auto-trains every 5 records.
    """
    try:
        record = request.json
        if record is None:
            return jsonify({'error': 'Invalid or missing JSON payload'}), 400
        result = ml_models.on_user_joined(record)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────────────
# EXISTING ENDPOINTS — no changes needed
# ─────────────────────────────────────────────────────
@app.route('/predict/waiting-time', methods=['POST'])
def predict_waiting_time():
    try:
        data = request.json
        if data is None:
            return jsonify({'error': 'Invalid or missing JSON payload'}), 400
        prediction = ml_models.predict_waiting_time(data)
        return jsonify({'waitingTime': prediction, 'unit': 'minutes'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/queue-length', methods=['POST'])
def predict_queue_length():
    try:
        prediction = ml_models.predict_queue_length(request.json)
        return jsonify({'queueLength': prediction})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/no-show', methods=['POST'])
def predict_no_show():
    try:
        probability = ml_models.predict_no_show_probability(request.json)
        return jsonify({'noShowProbability': probability, 'percentage': round(probability * 100, 1)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/peak-hours', methods=['POST'])
def predict_peak_hours():
    try:
        density = ml_models.predict_peak_hours(request.json)
        return jsonify({'queueDensity': density, 'isPeak': density > 25})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/suggest/best-time', methods=['POST'])
def suggest_best_time():
    try:
        data = request.json
        if data is None:
            return jsonify({'error': 'Invalid or missing JSON payload'}), 400
        suggestions = ml_models.suggest_best_time(data.get('service', 'General'), data.get('dayOfWeek'))
        return jsonify({'suggestions': suggestions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/train', methods=['POST'])
def train_models():
    """Manual bulk train — still available if needed"""
    try:
        data = request.json.get('data', [])
        if not data:
            return jsonify({'error': 'No training data provided'}), 400

        results = {
            'waitingTime': ml_models.train_waiting_time_model(data),
            'queueLength': ml_models.train_queue_length_model(data),
            'noShow':      ml_models.train_no_show_model(data),
            'peakHours':   ml_models.train_peak_hours_model(data)
        }
        ml_models.is_trained = True
        ml_models.record_training_results(results)
        return jsonify({'message': 'Models trained successfully', 'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ML service is running',
        'trained': ml_models.is_trained,
        'total_records': ml_models.total_records,
        'buffer_size': len(ml_models.buffer),
        'trains_at': ml_models.RETRAIN_EVERY if hasattr(ml_models, 'RETRAIN_EVERY') else 5,
        'model_scores': getattr(ml_models, 'model_scores', {})
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
