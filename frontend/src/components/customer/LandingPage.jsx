import React, { useState, useEffect } from 'react';
import Header from '../shared/Header';
import '../../styles/customer.css';
import {
  Building2,
  Landmark,
  Cpu,
  GraduationCap,
  ShoppingBag,
  Stethoscope,
  Clock,
  Users,
  Calendar,
  Target,
  Lightbulb,
  Rocket,
  Zap,
  BarChart2,
  Smartphone,
  CalendarDays,
  ShieldCheck,
  Briefcase,
  Brain,
  Hourglass,
  LineChart,
  CalendarCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Linkedin,
  Github
} from 'lucide-react';

import Logo from '../shared/Logo';

const LandingPage = ({ onNavigate, goBack, currentPage }) => {
  const [openFaq, setOpenFaq] = useState(null);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const initialTheme = localStorage.getItem('smartq-theme') || 'light';
    setTheme(initialTheme);

    const handleThemeChange = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(currentTheme);
    };

    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem('smartq-theme') || 'light';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    };

    window.addEventListener('storage', handleStorageChange);

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const companies = [
    { name: 'City General Hospital', logo: <Stethoscope size={48} color="#2563EB" />, industry: 'Healthcare' },
    { name: 'National Bank', logo: <Landmark size={48} color="#2563EB" />, industry: 'Banking' },
    { name: 'Tech Corp', logo: <Cpu size={48} color="#2563EB" />, industry: 'Technology' },
    { name: 'Regional Passport Office', logo: <Building2 size={48} color="#2563EB" />, industry: 'Government' },
    { name: 'Metro University', logo: <GraduationCap size={48} color="#2563EB" />, industry: 'Education' },
    { name: 'Prime Retail', logo: <ShoppingBag size={48} color="#2563EB" />, industry: 'Retail' }
  ];

  const faqs = [
    {
      question: 'What is Smart\'Q?',
      answer: 'Smart\'Q is an innovative queue management system that helps organizations manage customer queues efficiently while providing real-time updates and crowd predictions to customers.'
    },
    {
      question: 'How does the queue tracking work?',
      answer: 'Once you join a queue, you receive a token number. Our system tracks your position in real-time and provides estimated waiting times based on current queue flow and crowd levels.'
    },
    {
      question: 'Can I book slots for events in advance?',
      answer: 'Yes! You can view scheduled events and book slots using QR codes. Simply scan the QR code for any event to quickly join the queue for that specific event.'
    },
    {
      question: 'What do the crowd level indicators mean?',
      answer: 'Green (Low) means minimal wait time, Yellow (Medium) indicates moderate waiting, and Red (High) suggests longer wait times. Use this to plan your visit accordingly.'
    },
    {
      question: 'Is Smart\'Q free to use?',
      answer: 'Smart\'Q is free for customers. Organizations can contact us for enterprise pricing and implementation details.'
    },
    {
      question: 'How do I get started?',
      answer: 'Simply click "Join Queue" on the homepage, select your service, and you\'ll receive a token number. You can track your position in real-time through your dashboard.'
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <Header onNavigate={onNavigate} goBack={goBack} currentPage={currentPage} />

      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Smart Queue Management with Live Crowd Prediction</h1>
          <p className="hero-subtitle">
            Experience seamless queue management with real-time crowd predictions.
            Join queues, track your position, and manage your time efficiently.
          </p>
          <div className="hero-buttons">
            <button
              className="hero-button hero-button-primary"
              onClick={() => onNavigate('join-queue')}
            >
              Join as Guest
            </button>
            <button
              className="hero-button hero-button-secondary"
              onClick={() => onNavigate('login')}
              style={{
                borderColor: 'var(--color-white)',
                color: 'var(--color-white)'
              }}
            >
              Login
            </button>
          </div>
        </div>
        <div className="hero-image-wrapper">
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            maxWidth: '600px',
            height: '400px',
            margin: '0 auto',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
          }}>
            <img
              src={theme === 'dark' ? "/Smart'Q dark theme.jpg" : "/smartq-logo.jpg"}
              alt="Smart'Q Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '16px'
              }}
            />
          </div>
        </div>
      </section>

      <section style={{
        padding: '4rem 2rem',
        backgroundColor: 'var(--bg-primary)',
        width: '100%'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '2rem', color: 'var(--color-gray-900)', fontSize: '2.5rem' }}>Key Features</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginTop: '2rem'
          }}>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Clock size={48} color="var(--color-primary)" />
              </div>
              <h3 style={{ color: 'var(--color-gray-900)', marginBottom: '1rem' }}>Real-time Tracking</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>Track your position in the queue and estimated waiting time in real-time.</p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Users size={48} color="var(--color-primary)" />
              </div>
              <h3 style={{ color: 'var(--color-gray-900)', marginBottom: '1rem' }}>Crowd Prediction</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>Get live predictions about crowd levels to plan your visit better.</p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Calendar size={48} color="var(--color-primary)" />
              </div>
              <h3 style={{ color: 'var(--color-gray-900)', marginBottom: '1rem' }}>Event Scheduling</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>View and book slots for upcoming events and appointments.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{
        padding: '4rem 2rem',
        backgroundColor: 'var(--bg-primary)',
        width: '100%'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-gray-900)' }}>
              About Smart'Q
            </h2>
            <p style={{ fontSize: '1.25rem', color: 'var(--color-gray-600)', maxWidth: '800px', margin: '0 auto' }}>
              Revolutionizing queue management with intelligent technology
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginTop: '2rem'
          }}>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Target size={48} color="var(--color-primary)" />
              </div>
              <h3 style={{ color: 'var(--color-gray-900)', marginBottom: '1rem' }}>Our Mission</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                To eliminate waiting time uncertainty and transform the queue experience
                for both customers and service providers through smart technology.
              </p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Lightbulb size={48} color="var(--color-primary)" />
              </div>
              <h3 style={{ color: 'var(--color-gray-900)', marginBottom: '1rem' }}>Our Vision</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                To become the leading queue management solution, making every service
                interaction seamless, efficient, and customer-friendly.
              </p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Rocket size={48} color="var(--color-primary)" />
              </div>
              <h3 style={{ color: 'var(--color-gray-900)', marginBottom: '1rem' }}>Innovation</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                Leveraging real-time data analytics and AI-powered predictions to
                optimize queue flow and enhance customer satisfaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{
        padding: '4rem 2rem',
        backgroundColor: 'var(--bg-primary)',
        width: '100%'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-gray-900)' }}>
              Trusted by Leading Organizations
            </h2>
            <p style={{ fontSize: '1.25rem', color: 'var(--color-gray-600)' }}>
              Join hundreds of companies already using Smart'Q
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginTop: '2rem'
          }}>
            {companies.map((company, index) => (
              <div key={index} className="card" style={{
                textAlign: 'center',
                padding: '2rem',
                transition: 'transform 0.2s ease',
                border: '1px solid var(--color-gray-200)'
              }}>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>{company.logo}</div>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-gray-900)' }}>{company.name}</h3>
                <p style={{ color: 'var(--color-gray-600)', fontSize: '0.875rem' }}>{company.industry}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{
        padding: '4rem 2rem',
        backgroundColor: 'var(--bg-primary)',
        width: '100%'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-gray-900)' }}>Why Choose Smart'Q?</h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-600)' }}>
              Experience the difference with our comprehensive queue management solution
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem'
          }}>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Zap size={40} color="var(--color-primary)" />
              </div>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-gray-900)' }}>Real-Time Updates</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                Get instant notifications about your queue position and estimated wait times.
              </p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <BarChart2 size={40} color="var(--color-primary)" />
              </div>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-gray-900)' }}>Crowd Prediction</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                AI-powered predictions help you choose the best time to visit and reduce waits.
              </p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Smartphone size={40} color="var(--color-primary)" />
              </div>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-gray-900)' }}>QR Code Booking</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                Quick and easy slot booking through QR codes. Scan and join queues instantly.
              </p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <CalendarDays size={40} color="var(--color-primary)" />
              </div>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-gray-900)' }}>Event Scheduling</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                View and book slots for upcoming events in advance to never miss appointments.
              </p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <ShieldCheck size={40} color="var(--color-primary)" />
              </div>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-gray-900)' }}>Secure & Reliable</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                Your data is protected with enterprise-grade security. Our system is reliable 24/7.
              </p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Briefcase size={40} color="var(--color-primary)" />
              </div>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-gray-900)' }}>Enterprise Ready</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                Scalable solution for organizations of all sizes. Easy integration with workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{
        padding: '4rem 2rem',
        backgroundColor: 'var(--bg-primary)',
        width: '100%'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-gray-900)' }}>Powered by Machine Learning</h2>
            <p style={{ fontSize: '1.25rem', color: 'var(--color-gray-600)' }}>
              Advanced AI algorithms for accurate predictions and optimal queue management
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Brain size={40} color="var(--color-primary)" />
              </div>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-gray-900)' }}>Peak Time Prediction</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                Predict peaks with 92% accuracy, helping you avoid long waits.
              </p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Hourglass size={40} color="var(--color-primary)" />
              </div>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-gray-900)' }}>Wait Time Forecasting</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                Real-time forecasts using algorithms trained on millions of interactions.
              </p>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Users size={40} color="var(--color-primary)" />
              </div>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-gray-900)' }}>Crowd Level AI</h3>
              <p style={{ color: 'var(--color-gray-600)' }}>
                Advanced neural networks predict crowd levels for better resource allocation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{
        padding: '4rem 2rem',
        backgroundColor: 'var(--bg-primary)',
        width: '100%'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-gray-900)' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: '1.25rem', color: 'var(--color-gray-600)' }}>
              Everything you need to know about Smart'Q
            </p>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {faqs.map((faq, index) => (
              <div key={index} className="card" style={{
                marginBottom: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid var(--color-gray-200)'
              }} onClick={() => toggleFaq(index)}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0, color: 'var(--color-gray-900)', fontSize: '1.125rem' }}>
                    {faq.question}
                  </h3>
                  {openFaq === index ? <ChevronUp size={24} color="var(--color-primary)" /> : <ChevronDown size={24} color="var(--color-primary)" />}
                </div>
                {openFaq === index && (
                  <p style={{
                    marginTop: '1rem',
                    color: 'var(--color-gray-600)',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--color-gray-200)'
                  }}>
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Smart'Q</h3>
              </div>
              <p style={{ lineHeight: '1.6', fontSize: '0.9375rem' }}>
                Smarter queue management powered by intelligent technology-delivering seamless and efficient service experiences.
              </p>
            </div>

            <div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 700 }}>Quick Links</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('landing'); }} style={{ textDecoration: 'none', fontSize: '0.9375rem' }}>Home</a>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('login'); }} style={{ textDecoration: 'none', fontSize: '0.9375rem' }}>Login</a>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('join-queue'); }} style={{ textDecoration: 'none', fontSize: '0.9375rem' }}>Join Queue</a>
                </li>
              </ul>
            </div>

            <div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 700 }}>Contact Us</h3>
              <p style={{ margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} /> info@smartq.app
              </p>
              <p style={{ margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} /> +91 1234567890
              </p>
              <p style={{ margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} /> Bangalore, India
              </p>
            </div>

            <div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 700 }}>Follow Us</h3>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Instagram size={24} style={{ cursor: 'pointer' }} />
                <Linkedin size={24} style={{ cursor: 'pointer' }} />
                <Github size={24} style={{ cursor: 'pointer' }} />
              </div>
            </div>
          </div>
          <div style={{
            paddingTop: '2rem',
            marginTop: '2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              Smart&apos;Q — queue management demo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
