import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
  Activity, Users, Loader2, AlertCircle, CheckCircle2, 
  ChevronRight, Heart, Thermometer, Weight, ArrowLeft, Ruler 
} from 'lucide-react';

interface QueueToken {
  id: string;
  appointment_id: string;
  token_number: string;
  status: string;
  patient_name: string;
  doctor_name: string;
  department_name: string;
}

interface PatientDetails {
  id: string;
  mrn: string;
  gender: string;
  dob: string;
}

export const NurseDashboard: React.FC = () => {
  const [queue, setQueue] = useState<QueueToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<QueueToken | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientDetails | null>(null);
  
  // Loaders
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Vitals Form State
  const [bpSys, setBpSys] = useState<number | ''>('');
  const [bpDia, setBpDia] = useState<number | ''>('');
  const [pulse, setPulse] = useState<number | ''>('');
  const [temperature, setTemperature] = useState<number | ''>('');
  const [spo2, setSpo2] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [painScore, setPainScore] = useState<number>(0);
  const [triageLevel, setTriageLevel] = useState<string>('green');
  const [newsScore, setNewsScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let score = 0;
    const sys = Number(bpSys);
    const p = Number(pulse);
    const t = Number(temperature);
    const o2 = Number(spo2);

    if (bpSys !== '') {
      if (sys <= 90 || sys >= 220) score += 3;
      else if ((sys >= 91 && sys <= 100) || (sys >= 200 && sys <= 219)) score += 2;
      else if (sys >= 101 && sys <= 110) score += 1;
    }
    if (pulse !== '') {
      if (p <= 40 || p >= 131) score += 3;
      else if (p >= 111 && p <= 130) score += 2;
      else if ((p >= 41 && p <= 50) || (p >= 91 && p <= 110)) score += 1;
    }
    if (spo2 !== '') {
      if (o2 < 92) score += 3;
      else if (o2 === 92 || o2 === 93) score += 2;
      else if (o2 === 94 || o2 === 95) score += 1;
    }
    if (temperature !== '') {
      if (t <= 95.0 || t >= 102.3) score += 3;
      else if (t >= 100.5 && t <= 102.2) score += 2;
      else if ((t >= 95.1 && t <= 96.8)) score += 1;
    }

    setNewsScore(score);
    if (score >= 7) setTriageLevel('red');
    else if (score >= 4) setTriageLevel('yellow');
    else setTriageLevel('green');
  }, [bpSys, pulse, temperature, spo2]);

  useEffect(() => {
    fetchVitalsQueue();
  }, []);

  const fetchVitalsQueue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/appointments/queue');
      // Filter patients that are "waiting" or "in_vitals"
      const vitalsQueue = res.data.filter((t: QueueToken) => 
        ['waiting', 'in_vitals'].includes(t.status)
      );
      setQueue(vitalsQueue);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch patients list for vitals.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPatient = async (token: QueueToken) => {
    setError(null);
    setSuccessMsg(null);
    setSelectedToken(token);
    
    // Fetch patient detailed demographics (like MRN, Age/Gender) to show on triage card
    try {
      // Find appointment to get patient_id
      const appRes = await apiClient.get(`/api/appointments`, { params: { date: new Date().toISOString().split('T')[0] } });
      const activeApp = appRes.data.find((a: any) => a.id === token.appointment_id);
      if (activeApp) {
        const patientRes = await apiClient.get(`/api/patients/${activeApp.patient_id}`);
        setSelectedPatient(patientRes.data);
      }
    } catch (err) {
      console.error('Failed to load patient demographics:', err);
    }
  };

  // Auto-calculated BMI
  const getBmi = () => {
    if (!height || !weight) return null;
    const heightM = height / 100.0;
    return (weight / (heightM * heightM)).toFixed(2);
  };

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken || !selectedPatient) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        patient_id: selectedPatient.id,
        appointment_id: selectedToken.appointment_id,
        bp_sys: Number(bpSys),
        bp_dia: Number(bpDia),
        pulse: Number(pulse),
        temperature: Number(temperature),
        spo2: Number(spo2),
        height: Number(height),
        weight: Number(weight),
        pain_score: Number(painScore),
        triage_level: triageLevel,
        news_score: Number(newsScore)
      };

      await apiClient.post('/api/vitals', payload);
      setSuccessMsg(`Vitals recorded for ${selectedToken.patient_name}. Patient marked ready for Doctor!`);
      
      // Reset form
      setSelectedToken(null);
      setSelectedPatient(null);
      setBpSys('');
      setBpDia('');
      setPulse('');
      setTemperature('');
      setSpo2('');
      setHeight('');
      setWeight('');
      setPainScore(0);
      setTriageLevel('green');
      setNewsScore(0);

      // Refresh list
      await fetchVitalsQueue();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record vitals.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateAge = (dateString: string) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Nurse Vitals Worklist</h1>
        <p className="text-slate-500 text-sm">Measure patient physiological metrics (BP, Pulse, Temp, SpO2, BMI) and perform triage sorting.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-md flex items-start space-x-3">
          <CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-teal-700">{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Center Columns: Checked in patient list waiting for vitals */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center">
                <Users className="h-5 w-5 text-teal-600 mr-2" /> Vitals Check-in Queue
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
                {queue.length} Pending
              </span>
            </div>

            {isLoading && queue.length === 0 ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Token</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Patient Name</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">OPD Doctor</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
                        No checked-in patients waiting for vitals triage currently.
                      </td>
                    </tr>
                  ) : (
                    queue.map((token) => (
                      <tr 
                        key={token.id} 
                        className={`hover:bg-slate-50/50 cursor-pointer transition-all ${
                          selectedToken?.id === token.id ? 'bg-teal-50/30' : ''
                        }`}
                        onClick={() => handleSelectPatient(token)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-teal-700 font-mono">{token.token_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">{token.patient_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold">{token.doctor_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">{token.department_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPatient(token);
                            }}
                            className="text-teal-600 hover:text-teal-800 font-bold inline-flex items-center"
                          >
                            Triage Vitals <ChevronRight className="h-4 w-4 ml-0.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Vitals Form Workspace */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 h-fit">
          <div className="border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Physiological Vitals Entry</h3>
          </div>

          {!selectedToken || !selectedPatient ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Activity className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">Select a patient from the queue to start measuring vitals.</p>
            </div>
          ) : (
            <form onSubmit={handleRecordVitals} className="space-y-4 text-xs font-semibold text-slate-700">
              
              {/* Demographics Summary Card */}
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-2 shadow-inner">
                <h4 className="text-xs font-bold text-white truncate">{selectedToken.patient_name}</h4>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>MRN: {selectedPatient.mrn}</span>
                  <span>{calculateAge(selectedPatient.dob)} Yrs / {selectedPatient.gender}</span>
                </div>
              </div>

              {/* BP & Pulse */}
              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 tracking-wider">BP Systolic</label>
                  <input
                    type="number"
                    required
                    min={40}
                    max={250}
                    value={bpSys}
                    onChange={(e) => setBpSys(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    placeholder="mmHg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 tracking-wider">BP Diastolic</label>
                  <input
                    type="number"
                    required
                    min={30}
                    max={150}
                    value={bpDia}
                    onChange={(e) => setBpDia(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    placeholder="mmHg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 tracking-wider">Pulse Rate</label>
                  <input
                    type="number"
                    required
                    min={30}
                    max={220}
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    placeholder="bpm"
                  />
                </div>
              </div>

              {/* Temp & SpO2 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 tracking-wider">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    min={90.0}
                    max={110.0}
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    placeholder="°F"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 tracking-wider">SpO2 (Oxygen)</label>
                  <input
                    type="number"
                    required
                    min={50}
                    max={100}
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    placeholder="%"
                  />
                </div>
              </div>

              {/* Height & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 tracking-wider">Height (cm)</label>
                  <input
                    type="number"
                    required
                    min={30}
                    max={250}
                    value={height}
                    onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    placeholder="cm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 tracking-wider">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={300}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    placeholder="kg"
                  />
                </div>
              </div>

              {/* Calculated BMI */}
              {getBmi() && (
                <div className="bg-slate-550/10 bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Calculated BMI:</span>
                  <span className="text-sm font-bold text-teal-700 font-mono">{getBmi()} kg/m²</span>
                </div>
              )}

              {/* Pain & Triage Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 tracking-wider">Pain Scale (0-10)</label>
                  <select
                    value={painScore}
                    onChange={(e) => setPainScore(Number(e.target.value))}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    {[...Array(11).keys()].map(val => (
                      <option key={val} value={val}>{val} - {val === 0 ? 'No Pain' : val === 10 ? 'Severe' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 tracking-wider">NEWS Score (Triage)</label>
                  <div className={`mt-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 border text-xs font-bold ${
                    triageLevel === 'red' ? 'bg-red-50 border-red-200 text-red-700' :
                    triageLevel === 'yellow' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                    'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    <span className="uppercase">{triageLevel} Alert</span>
                    <span className="font-mono bg-white px-1.5 py-0.5 rounded border">Score: {newsScore}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedToken(null);
                    setSelectedPatient(null);
                  }}
                  className="flex-1 text-center py-2.5 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-center py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-1.5" /> : null}
                  Confirm & Call Doctor
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default NurseDashboard;
