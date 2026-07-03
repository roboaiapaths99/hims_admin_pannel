import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { 
  Video, PhoneOff, AlertCircle, Loader2, User, Play, Info, ShieldCheck
} from 'lucide-react';

export const PatientTeleconsultation: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  // States
  const [session, setSession] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Check telemedicine session status from public endpoint
  useEffect(() => {
    if (sessionId) {
      fetchSessionStatus();
    }
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, [sessionId]);

  const fetchSessionStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/telemedicine/sessions/${sessionId}/public`);
      setSession(res.data);
      if (res.data.status === 'closed') {
        setError('This teleconsultation session has ended.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid telemedicine session link or session has expired.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Initialize Jitsi Meet IFrame API when user clicks Join
  const handleJoinCall = () => {
    if (!displayName.trim()) return;
    setHasJoined(true);

    // Give React time to render the container div
    setTimeout(() => {
      if ((window as any).JitsiMeetExternalAPI && jitsiContainerRef.current) {
        const domain = session.jitsi_domain || 'meet.jit.si';
        const options = {
          roomName: session.room_name,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          userInfo: {
            displayName: displayName.trim()
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'chat', 'settings', 'tileview'
            ],
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            MOBILE_APP_PROMO: false
          }
        };

        const api = new (window as any).JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        api.addEventListener('videoConferenceLeft', () => {
          handleLeaveCall();
        });
      }
    }, 100);
  };

  const handleLeaveCall = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setHasJoined(false);
    // Re-verify status
    fetchSessionStatus();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin h-10 w-10 text-teal-500 mx-auto" />
          <p className="text-xs text-slate-400 font-mono tracking-wider">Connecting to Hospital Telemedicine Server...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-xl">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-950 border border-red-800 text-red-500">
            <PhoneOff className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Consultation Ended or Invalid</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 text-[11px] text-slate-500 leading-relaxed">
            If you believe this is an error, please reach out to your hospital branch administration or receptionist to request a new consultation invitation link.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
      {!hasJoined ? (
        // Patient Lobby Screen
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Top clinical teal bar */}
            <div className="h-2 bg-teal-500" />
            
            <div className="p-8 space-y-6">
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono">Secure Telehealth Lobby</span>
                <h1 className="text-xl font-extrabold text-white">Private Video Consultation</h1>
                <p className="text-xs text-slate-400">Join your healthcare provider for your scheduled online clinic session.</p>
              </div>

              {/* Secure Info Panel */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-400">
                <ShieldCheck className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-slate-200">End-to-End Privacy Guarded</span>
                  <p className="leading-relaxed text-[11px]">This consultation is encrypted and runs inside a unique room slug scoped directly to your medical appointment record. No login details are required.</p>
                </div>
              </div>

              {/* Lobby Join Form */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Enter your name (e.g. John Doe)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-600"
                    />
                  </div>
                </div>

                <button
                  onClick={handleJoinCall}
                  disabled={!displayName.trim()}
                  className="w-full inline-flex items-center justify-center py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm rounded-xl shadow-lg cursor-pointer transition-all disabled:cursor-not-allowed"
                >
                  <Play className="h-4.5 w-4.5 mr-2" /> Connect to Call
                </button>
              </div>

              {/* Camera & Mic Note */}
              <div className="flex items-center space-x-2 text-[10px] text-slate-500 justify-center">
                <Info className="h-3.5 w-3.5" />
                <span>Please allow microphone and camera access when prompted by your browser.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Active Call Full-Screen Screen
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
          {/* Header Call Panel */}
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">Live Video Consultation</span>
            </div>

            <button
              onClick={handleLeaveCall}
              className="inline-flex items-center px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <PhoneOff className="h-4 w-4 mr-1.5" /> Leave Call
            </button>
          </div>

          {/* Jitsi Meet Container */}
          <div className="flex-1 relative w-full h-full">
            <div ref={jitsiContainerRef} className="w-full h-full bg-slate-950" id="jitsi-container" />
          </div>
        </div>
      )}
    </div>
  );
};
export default PatientTeleconsultation;
