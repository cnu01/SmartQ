import React, { useState } from 'react';
import {
    Settings,
    User,
    Bell,
    Shield,
    Clock,
    Globe,
    Moon,
    Sun,
    Save,
    CheckCircle,
    Building2,
    Mail,
    Phone,
    MapPin,
    Key,
    Eye,
    EyeOff,
    ToggleLeft,
    ToggleRight,
    LogOut
} from 'lucide-react';
import Sidebar from '../shared/Sidebar';
import '../../styles/admin.css';
import '../../styles/global.css';
import { changeAdminPassword } from '../../services/api';

const ADMIN_PREFERENCES_STORAGE_KEY = 'smartq-admin-preferences';

const AdminSettings = ({ onNavigate, goBack, currentPage }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [saved, setSaved] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Profile State
    const [profile, setProfile] = useState({
        name: 'Main Admin',
        email: 'admin@smartq.local',
        phone: '+91 1234567890',
        organization: "Smart'Q Systems",
        location: 'Bangalore, India'
    });

    // Notification State
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        queueAlerts: true,
        crowdAlerts: true,
        dailyReport: false,
        weeklyReport: true,
        maintenanceAlerts: true
    });

    // Preferences State
    const [preferences, setPreferences] = useState(() => {
        let savedPreferences = {};

        try {
            savedPreferences = JSON.parse(localStorage.getItem(ADMIN_PREFERENCES_STORAGE_KEY) || '{}');
        } catch (error) {
            savedPreferences = {};
        }

        return {
            theme: savedPreferences.theme || localStorage.getItem('smartq-theme') || 'light',
            language: 'en',
            timezone: savedPreferences.timezone || 'Asia/Kolkata',
            autoRefresh: savedPreferences.autoRefresh ?? true,
            refreshInterval: savedPreferences.refreshInterval || '30',
            soundNotifications: savedPreferences.soundNotifications ?? false
        };
    });

    // Password State
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const handleSave = () => {
        if (activeTab === 'preferences') {
            const nextPreferences = {
                ...preferences,
                language: 'en'
            };

            localStorage.setItem(ADMIN_PREFERENCES_STORAGE_KEY, JSON.stringify(nextPreferences));
            localStorage.setItem('smartq-theme', preferences.theme);
            document.documentElement.setAttribute('data-theme', preferences.theme);
            setPreferences(nextPreferences);
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleThemeChange = (newTheme) => {
        setPreferences(prev => ({ ...prev, theme: newTheme }));
        localStorage.setItem('smartq-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const handleLogout = () => {
        onNavigate('landing');
    };

    const handlePasswordUpdate = async () => {
        setPasswordMessage('');
        setPasswordError('');

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordError('Please fill all password fields.');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('New password and confirm password do not match.');
            return;
        }

        try {
            setPasswordSaving(true);
            const res = await changeAdminPassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });

            setPasswordMessage(res?.message || 'Password updated successfully');
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            setPasswordError(error?.response?.data?.message || 'Failed to update password');
        } finally {
            setPasswordSaving(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <User size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
        { id: 'preferences', label: 'Preferences', icon: <Globe size={18} /> },
        { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-gray-900)' }}>Profile Information</h3>
                        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                            Update your admin profile details and organization information.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <User size={14} /> Full Name
                                </label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={14} /> Email Address
                                </label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Phone size={14} /> Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={profile.phone}
                                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building2 size={14} /> Organization
                                </label>
                                <input
                                    type="text"
                                    value={profile.organization}
                                    onChange={(e) => setProfile(prev => ({ ...prev, organization: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MapPin size={14} /> Location
                                </label>
                                <input
                                    type="text"
                                    value={profile.location}
                                    onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Save size={16} /> Save Changes
                            </button>
                            {saved && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-green)', fontSize: '0.875rem', fontWeight: 600 }}>
                                    <CheckCircle size={16} /> Saved successfully!
                                </span>
                            )}
                        </div>
                    </div>
                );

            case 'notifications':
                return (
                    <div>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-gray-900)' }}>Notification Preferences</h3>
                        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                            Configure how and when you receive alerts and reports.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive important alerts via email' },
                                { key: 'queueAlerts', label: 'Queue Overflow Alerts', desc: 'Get notified when queues exceed capacity' },
                                { key: 'crowdAlerts', label: 'Crowd Level Warnings', desc: 'Alerts when crowd levels reach critical thresholds' },
                                { key: 'dailyReport', label: 'Daily Summary Report', desc: 'Receive a daily activity summary each morning' },
                                { key: 'weeklyReport', label: 'Weekly Analytics Report', desc: 'Get weekly performance insights every Monday' },
                                { key: 'maintenanceAlerts', label: 'System Maintenance Alerts', desc: 'Be notified about scheduled maintenance' },
                            ].map(item => (
                                <div key={item.key} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1.25rem',
                                    backgroundColor: 'var(--color-gray-50)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--color-gray-200)',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: '0.25rem' }}>{item.label}</div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{item.desc}</div>
                                    </div>
                                    <button
                                        onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: notifications[item.key] ? 'var(--color-primary)' : 'var(--color-gray-400)',
                                            padding: '0',
                                            display: 'flex',
                                            transition: 'color 0.2s ease'
                                        }}
                                    >
                                        {notifications[item.key] ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Save size={16} /> Save Preferences
                            </button>
                        </div>
                    </div>
                );

            case 'preferences':
                return (
                    <div>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-gray-900)' }}>System Preferences</h3>
                        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                            Customize your dashboard experience and system behavior.
                        </p>

                        {/* Theme Selection */}
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ marginBottom: '0.75rem', display: 'block', fontWeight: 600, color: 'var(--color-gray-800)' }}>
                                Appearance
                            </label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    style={{
                                        flex: 1,
                                        padding: '1.25rem',
                                        borderRadius: '12px',
                                        border: preferences.theme === 'light' ? '2px solid var(--color-primary)' : '2px solid var(--color-gray-200)',
                                        background: preferences.theme === 'light' ? 'var(--color-primary-bg)' : 'var(--color-white)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <Sun size={28} color={preferences.theme === 'light' ? 'var(--color-primary)' : 'var(--color-gray-400)'} />
                                    <span style={{ fontWeight: 600, color: preferences.theme === 'light' ? 'var(--color-primary)' : 'var(--color-gray-600)' }}>Light Mode</span>
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    style={{
                                        flex: 1,
                                        padding: '1.25rem',
                                        borderRadius: '12px',
                                        border: preferences.theme === 'dark' ? '2px solid var(--color-primary)' : '2px solid var(--color-gray-200)',
                                        background: preferences.theme === 'dark' ? 'var(--color-primary-bg)' : 'var(--color-white)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <Moon size={28} color={preferences.theme === 'dark' ? 'var(--color-primary)' : 'var(--color-gray-400)'} />
                                    <span style={{ fontWeight: 600, color: preferences.theme === 'dark' ? 'var(--color-primary)' : 'var(--color-gray-600)' }}>Dark Mode</span>
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Globe size={14} /> Language
                                </label>
                                <select
                                    value={preferences.language}
                                    onChange={() => {
                                        setPreferences(prev => ({ ...prev, language: 'en' }));
                                    }}
                                    style={{ padding: '0.75rem', borderRadius: '8px', border: '2px solid var(--color-gray-300)', width: '100%', background: 'var(--color-white)', color: 'var(--color-gray-900)' }}
                                >
                                    <option value="en">English</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Clock size={14} /> Timezone
                                </label>
                                <select
                                    value={preferences.timezone}
                                    onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                                    style={{ padding: '0.75rem', borderRadius: '8px', border: '2px solid var(--color-gray-300)', width: '100%', background: 'var(--color-white)', color: 'var(--color-gray-900)' }}
                                >
                                    <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
                                    <option value="Asia/Bangalore">IST (Asia/Bangalore)</option>
                                    <option value="Asia/Chennai">IST (Asia/Chennai)</option>
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">EST (America/New_York)</option>
                                    <option value="Europe/London">GMT (Europe/London)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Clock size={14} /> Dashboard Auto-Refresh
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <select
                                        value={preferences.refreshInterval}
                                        onChange={(e) => setPreferences(prev => ({ ...prev, refreshInterval: e.target.value }))}
                                        style={{ padding: '0.75rem', borderRadius: '8px', border: '2px solid var(--color-gray-300)', flex: 1, background: 'var(--color-white)', color: 'var(--color-gray-900)' }}
                                    >
                                        <option value="15">Every 15 seconds</option>
                                        <option value="30">Every 30 seconds</option>
                                        <option value="60">Every 1 minute</option>
                                        <option value="300">Every 5 minutes</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Save size={16} /> Save Preferences
                            </button>
                        </div>
                    </div>
                );

            case 'security':
                return (
                    <div>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-gray-900)' }}>Security Settings</h3>
                        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                            Manage your password and account security options.
                        </p>

                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'var(--color-gray-50)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-gray-200)',
                            marginBottom: '2rem'
                        }}>
                            <h4 style={{ marginBottom: '1.5rem', color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Key size={18} /> Change Password
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '480px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Current Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                            placeholder="Enter current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--color-gray-400)',
                                                padding: '4px'
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--color-gray-400)',
                                                padding: '4px'
                                            }}
                                        >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>

                            {(passwordError || passwordMessage) && (
                                <p
                                    style={{
                                        marginTop: '1rem',
                                        marginBottom: 0,
                                        color: passwordError ? 'var(--color-red)' : 'var(--color-green)',
                                        fontWeight: 600,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {passwordError || passwordMessage}
                                </p>
                            )}

                            <button
                                className="btn-primary"
                                onClick={handlePasswordUpdate}
                                disabled={passwordSaving}
                                style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Shield size={16} /> {passwordSaving ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>

                        {/* Session Info */}
                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'var(--color-gray-50)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-gray-200)',
                            marginBottom: '2rem'
                        }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--color-gray-900)' }}>Active Session</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-gray-600)', fontSize: '0.875rem' }}>Login Time</span>
                                    <span style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.875rem' }}>
                                        {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-gray-600)', fontSize: '0.875rem' }}>Session Status</span>
                                    <span className="badge badge-green">Active</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-gray-600)', fontSize: '0.875rem' }}>Role</span>
                                    <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.875rem' }}>Administrator</span>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'var(--color-red-bg)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-red-light)',
                        }}>
                            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-red)' }}>Danger Zone</h4>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)', marginBottom: '1rem' }}>
                                Logging out will end your current session and redirect to the public site.
                            </p>
                            <button
                                className="btn-danger"
                                onClick={handleLogout}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <LogOut size={16} /> Log Out
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="admin-layout">
            <Sidebar currentPage={currentPage} onNavigate={onNavigate} goBack={goBack} />
            <main className="admin-main">
                <div className="admin-header">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Settings size={28} /> Settings
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {/* Tab Navigation */}
                    <div style={{
                        width: '220px',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.375rem'
                    }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.875rem 1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: activeTab === tab.id ? 700 : 500,
                                    fontSize: '0.9375rem',
                                    backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                                    color: activeTab === tab.id ? '#fff' : 'var(--color-gray-700)',
                                    transition: 'all 0.2s ease',
                                    textAlign: 'left',
                                    justifyContent: 'flex-start'
                                }}
                                onMouseOver={(e) => {
                                    if (activeTab !== tab.id) {
                                        e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (activeTab !== tab.id) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{
                        flex: 1,
                        minWidth: 0,
                        backgroundColor: 'var(--color-white)',
                        borderRadius: '16px',
                        padding: '2rem',
                        boxShadow: 'var(--shadow-md)',
                        border: '1px solid var(--color-gray-200)'
                    }}>
                        {saved && (
                            <div className="success-message" style={{ marginBottom: '1.5rem' }}>
                                <CheckCircle size={18} /> Changes saved successfully!
                            </div>
                        )}
                        {renderTabContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminSettings;
