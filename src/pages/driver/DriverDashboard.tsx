import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../../api/client';
import { AlertTriangle, MapPin, Truck, Phone, Navigation, Play, User, CheckCircle, Volume2, VolumeX } from 'lucide-react';

interface ActiveSOS {
  id: string;
  patient_name: string;
  phone: string;
  mrn: string;
  latitude: number;
  longitude: number;
  fallback_used: boolean;
  time: string;
}

export const DriverDashboard: React.FC = () => {
  const [activeSOS, setActiveSOS] = useState<ActiveSOS[]>([]);
  const [incomingSOS, setIncomingSOS] = useState<ActiveSOS | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Driver settings
  const [driverName, setDriverName] = useState('Ramesh Kumar');
  const [ambulanceNo, setAmbulanceNo] = useState('MH-12-PQ-9876');
  const [driverPhone, setDriverPhone] = useState('9876543210');
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize browser Audio context on any user click
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  // Sound Alarm Generator (Synthesizes buzzer directly in browser)
  const startAlarmSound = () => {
    if (!soundEnabled || audioIntervalRef.current) return;
    initAudio();
    
    audioIntervalRef.current = window.setInterval(() => {
      if (!audioContextRef.current) return;
      try {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioContextRef.current.currentTime); // High buzzer pitch
        osc.frequency.exponentialRampToValueAtTime(440, audioContextRef.current.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.15, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.4);
      } catch (e) {
        console.error('Audio synthesis failed', e);
      }
    }, 800); // Pulse alarm every 800ms
  };

  const stopAlarmSound = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchActiveSOS();
    
    // Connect WebSockets
    const socketBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002';
    const cleanSocketUrl = socketBase.replace('/api', '');
    const socket = io(cleanSocketUrl, {
      transports: ['websocket'],
      upgrade: false
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Ambulance driver socket connected:', socket.id);
      socket.emit('join_drivers');
    });

    // Listen for real-time SOS alerts
    socket.on('sos_emergency_alert', (data: any) => {
      console.log('Real-time SOS Alert received!', data);
      const newSOS: ActiveSOS = {
        id: data.sos_id,
        patient_name: data.patient_name,
        phone: data.phone,
        mrn: data.mrn,
        latitude: data.latitude,
        longitude: data.longitude,
        fallback_used: data.fallback_used,
        time: data.time
      };
      
      setIncomingSOS(newSOS);
      setActiveSOS((prev) => [newSOS, ...prev]);
      startAlarmSound();
    });

    return () => {
      socket.disconnect();
      stopAlarmSound();
    };
  }, []);

  const fetchActiveSOS = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/emergency/sos/active');
      setActiveSOS(res.data);
    } catch (e) {
      console.error('Failed to load active SOS alarms', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSOS = async (sos: ActiveSOS) => {
    initAudio();
    stopAlarmSound();
    
    try {
      await apiClient.post(`/api/emergency/sos/${sos.id}/accept`, {
        driver_name: driverName,
        ambulance_no: ambulanceNo,
        phone: driverPhone
      });
      
      // Remove from active alerts feed
      setActiveSOS((prev) => prev.filter((item) => item.id !== sos.id));
      if (incomingSOS?.id === sos.id) {
        setIncomingSOS(null);
      }
      
      // Direct driver navigation route via Google Maps external tab redirect
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${sos.latitude},${sos.longitude}`;
      window.open(googleMapsUrl, '_blank');
      
    } catch (e) {
      console.error('Error accepting emergency dispatch', e);
      alert('Could not dispatch ambulance. Verify connection.');
    }
  };

  const handleDismissIncoming = () => {
    stopAlarmSound();
    setIncomingSOS(null);
  };

  return (
    <div onClick={initAudio} className="min-h-screen bg-slate-900 text-white p-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 space-y-4 md:space-y-0">
        <div>
          <div className="flex items-center space-x-2 text-red-500">
            <Truck className="h-6 w-6 animate-pulse" />
            <h1 className="text-xl font-black uppercase tracking-wider">Mobile Ambulance dispatch system</h1>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">Real-time patient panic alerts and navigation routing</p>
        </div>

        {/* Audio control toggler */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            soundEnabled ? 'bg-red-950/40 border-red-800 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span>{soundEnabled ? 'Siren Enabled' : 'Siren Silenced'}</span>
        </button>
      </div>

      {/* Driver Configuration Row */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase">Driver Name</label>
          <input 
            type="text" 
            value={driverName} 
            onChange={(e) => setDriverName(e.target.value)}
            className="mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 w-full text-xs font-bold focus:ring-1 focus:ring-red-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase">Ambulance Vehicle Number</label>
          <input 
            type="text" 
            value={ambulanceNo} 
            onChange={(e) => setAmbulanceNo(e.target.value)}
            className="mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 w-full text-xs font-bold focus:ring-1 focus:ring-red-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase">Driver Mobile Phone</label>
          <input 
            type="text" 
            value={driverPhone} 
            onChange={(e) => setDriverPhone(e.target.value)}
            className="mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 w-full text-xs font-bold focus:ring-1 focus:ring-red-500 outline-none"
          />
        </div>
      </div>

      {/* Incoming Flashing Alert Panel (Popups on new socket alert) */}
      {incomingSOS && (
        <div className="bg-red-950/60 border-2 border-red-600 rounded-2xl p-6 shadow-2xl animate-bounce space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2 text-red-500">
              <AlertTriangle className="h-7 w-7 animate-pulse" />
              <h2 className="text-lg font-black uppercase tracking-wider">Urgent SOS Alert Received!</h2>
            </div>
            <button 
              onClick={handleDismissIncoming}
              className="text-slate-400 hover:text-white font-bold"
            >
              ✕ Dismiss Siren
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-slate-300 text-xs">Patient details:</p>
              <div className="text-xl font-extrabold">{incomingSOS.patient_name}</div>
              <div className="text-slate-400 text-xs flex items-center">
                <Phone className="h-3.5 w-3.5 mr-1" /> Contact: {incomingSOS.phone}
              </div>
              <div className="text-slate-400 text-xs">MRN: {incomingSOS.mrn}</div>
            </div>

            <div className="space-y-3 bg-red-950/30 p-4 border border-red-900/60 rounded-xl flex flex-col justify-center">
              <div className="text-xs text-red-400 flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Coordinates: {incomingSOS.latitude.toFixed(5)}, {incomingSOS.longitude.toFixed(5)} {incomingSOS.fallback_used && '(Mock GPS Address)'}</span>
              </div>
              <button
                onClick={() => handleAcceptSOS(incomingSOS)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-red-900"
              >
                <Navigation className="h-4 w-4 animate-spin" />
                <span>Accept & Dispatch Ambulance</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Alerts Feed Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-200">Active Unclaimed Panic Alerts</h2>
        
        {loading ? (
          <div className="text-slate-400 text-xs py-8 text-center">Scanning dispatch terminals...</div>
        ) : activeSOS.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-500 text-sm">
            No active emergency SOS requests reported in this branch.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeSOS.map((sos) => (
              <div key={sos.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 bg-red-950 text-red-400 font-bold text-[10px] rounded-full uppercase border border-red-900">SOS ACTIVE</span>
                    <span className="text-[10px] text-slate-500">{new Date(sos.time).toLocaleTimeString()}</span>
                  </div>
                  <h3 className="text-lg font-bold">{sos.patient_name}</h3>
                  <p className="text-xs text-slate-400 flex items-center">
                    <Phone className="h-3.5 w-3.5 mr-1 text-slate-500" /> Phone: {sos.phone}
                  </p>
                  <p className="text-xs text-slate-500">MRN: {sos.mrn}</p>
                </div>

                <div className="border-t border-slate-700 pt-4 flex flex-col space-y-2">
                  <div className="text-xs text-slate-400 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-teal-500" />
                    <span>Location: {sos.latitude.toFixed(5)}, {sos.longitude.toFixed(5)} {sos.fallback_used && '(Branch Center Fallback)'}</span>
                  </div>
                  <button
                    onClick={() => handleAcceptSOS(sos)}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Navigation className="h-4 w-4" />
                    <span>Accept & Navigate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default DriverDashboard;
