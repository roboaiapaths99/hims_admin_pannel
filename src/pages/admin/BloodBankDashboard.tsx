import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { apiClient } from '../../api/client';
import { Alert } from '../../components/Alert';
import { FormField } from '../../components/FormField';
import { 
  Droplet, Users, ClipboardCheck, Activity, ShieldAlert, 
  Plus, Check, X, Loader2, Save, Trash2, Calendar, FileText
} from 'lucide-react';

interface BloodBag {
  id: string;
  bag_number: string;
  blood_group: string;
  component_type: string;
  volume_ml: number;
  status: string;
  expiry_date: string;
}

interface BloodDonor {
  id: string;
  donor_number: string;
  name: string;
  gender: string;
  dob: string;
  phone: string;
  email?: string;
  blood_group: string;
  screening_vitals?: {
    hemoglobin: number;
    weight: number;
    bp_sys: number;
    bp_dia: number;
    pulse: number;
    temperature: number;
    eligible: boolean;
    notes?: string;
  };
}

interface BloodRequisition {
  id: string;
  request_number: string;
  patient_id: string;
  patient_name: string;
  blood_group: string;
  component_type: string;
  units_requested: number;
  urgency: string;
  status: string;
  allocated_bags: string[];
}

export const BloodBankDashboard: React.FC = () => {
  // Lists State
  const [stock, setStock] = useState<{ summary: Record<string, number>; bags: BloodBag[] }>({ summary: {}, bags: [] });
  const [donors, setDonors] = useState<BloodDonor[]>([]);
  const [requisitions, setRequisitions] = useState<BloodRequisition[]>([]);
  
  // App states
  const [activeTab, setActiveTab] = useState<'inventory' | 'donors' | 'donations' | 'requisitions' | 'alerts'>('inventory');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Emergency buzzer alert states
  const [alertBloodGroup, setAlertBloodGroup] = useState('O-');
  const [activeBuzzerId, setActiveBuzzerId] = useState<string | null>(null);
  const [activeBuzzerGroup, setActiveBuzzerGroup] = useState<string>('O-');
  const [responderList, setResponderList] = useState<any[]>([]);

  // Active Modals State
  const [activeModal, setActiveModal] = useState<string | null>(null); // 'add_donor', 'screen_donor', 'donate', 'lab_test', 'requisition', 'crossmatch', 'transfuse', 'discard'
  
  // Selected IDs for multi-step processes
  const [selectedDonor, setSelectedDonor] = useState<BloodDonor | null>(null);
  const [selectedBag, setSelectedBag] = useState<BloodBag | null>(null);
  const [selectedRequisition, setSelectedRequisition] = useState<BloodRequisition | null>(null);

  // Form Fields State
  // 1. Add Donor
  const [donorName, setDonorName] = useState('');
  const [donorGender, setDonorGender] = useState('Male');
  const [donorDob, setDonorDob] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorGroup, setDonorGroup] = useState('O+');

  // 2. Screen Donor
  const [hb, setHb] = useState(13.5);
  const [weight, setWeight] = useState(65);
  const [bpSys, setBpSys] = useState(120);
  const [bpDia, setBpDia] = useState(80);
  const [pulse, setPulse] = useState(72);
  const [temp, setTemp] = useState(98.6);
  const [screeningEligible, setScreeningEligible] = useState(true);
  const [screeningNotes, setScreeningNotes] = useState('');

  // 3. Donation Log
  const [donationVolume, setDonationVolume] = useState(350);
  const [donationTechnician, setDonationTechnician] = useState('');

  // 4. Lab Testing
  const [hiv, setHiv] = useState('Non-Reactive');
  const [hepB, setHepB] = useState('Non-Reactive');
  const [hepC, setHepC] = useState('Non-Reactive');
  const [syphilis, setSyphilis] = useState('Non-Reactive');
  const [malaria, setMalaria] = useState('Non-Reactive');
  const [labNotes, setLabNotes] = useState('');

  // 5. Requisition
  const [reqPatientId, setReqPatientId] = useState('');
  const [reqBloodGroup, setReqBloodGroup] = useState('O+');
  const [reqComponent, setReqComponent] = useState('Whole Blood');
  const [reqUnits, setReqUnits] = useState(1);
  const [reqUrgency, setReqUrgency] = useState('routine');

  // 6. Crossmatch
  const [crossmatchBagNumber, setCrossmatchBagNumber] = useState('');

  // 7. Transfusion
  const [transfusionBagNumber, setTransfusionBagNumber] = useState('');
  const [transfusedBy, setTransfusedBy] = useState('');
  const [bpBefore, setBpBefore] = useState('');
  const [pulseBefore, setPulseBefore] = useState(72);
  const [tempBefore, setTempBefore] = useState(98.6);
  const [bpAfter, setBpAfter] = useState('');
  const [pulseAfter, setPulseAfter] = useState(72);
  const [tempAfter, setTempAfter] = useState(98.6);
  const [reactionLogged, setReactionLogged] = useState(false);
  const [reactionDetails, setReactionDetails] = useState('');

  // 8. Discard Bag
  const [discardReason, setDiscardReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Socket setup for real-time responder alerts
  useEffect(() => {
    if (!activeBuzzerId) return;
    
    const socketBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002';
    const cleanSocketUrl = socketBase.replace('/api', '');
    const socket = io(cleanSocketUrl, {
      transports: ['websocket'],
      upgrade: false
    });

    socket.on('connect', () => {
      console.log('Blood Bank Admin socket connected:', socket.id);
      socket.emit('join_admins');
    });

    socket.on('donation_accepted', (data: any) => {
      console.log('Donor acceptance received real-time!', data);
      if (data.broadcast_id === activeBuzzerId) {
        setResponderList((prev) => [data, ...prev]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeBuzzerId]);

  const handleStartBroadcast = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.post('/api/blood-bank/broadcast-buzzer', {
        blood_group: alertBloodGroup
      });
      setActiveBuzzerId(res.data.broadcast_id);
      setActiveBuzzerGroup(alertBloodGroup);
      setResponderList([]);
      setSuccess(`Urgent ${alertBloodGroup} donation buzzer broadcasted to all patient devices!`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to trigger blood donation broadcast.');
    }
  };

  const handleStopBroadcast = async () => {
    if (!activeBuzzerId) return;
    try {
      await apiClient.post(`/api/blood-bank/buzzer/${activeBuzzerId}/stop`);
      setActiveBuzzerId(null);
      setSuccess('Emergency blood buzzer deactivated.');
    } catch (err: any) {
      console.error(err);
      setError('Failed to stop active broadcast.');
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [stockRes, donorsRes, reqsRes] = await Promise.all([
        apiClient.get('/api/blood-bank/stock'),
        apiClient.get('/api/blood-bank/donors'),
        apiClient.get('/api/blood-bank/requisitions')
      ]);
      setStock(stockRes.data);
      setDonors(donorsRes.data);
      setRequisitions(reqsRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch blood bank information. Verify server connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSuccess(null);
    setError(null);
  };

  const openModal = (modalName: string, donor?: BloodDonor, bag?: BloodBag, req?: BloodRequisition) => {
    if (donor) {
      setSelectedDonor(donor);
      // Prefill vitals if registering donation
      setDonationTechnician('');
      setDonationVolume(350);
    }
    if (bag) {
      setSelectedBag(bag);
      setCrossmatchBagNumber(bag.bag_number);
      setTransfusionBagNumber(bag.bag_number);
    }
    if (req) {
      setSelectedRequisition(req);
    }
    setActiveModal(modalName);
    setError(null);
    setSuccess(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedDonor(null);
    setSelectedBag(null);
    setSelectedRequisition(null);
  };

  // Submit Handlers
  const handleAddDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiClient.post('/api/blood-bank/donors', {
        name: donorName,
        gender: donorGender,
        dob: donorDob,
        phone: donorPhone,
        email: donorEmail || null,
        blood_group: donorGroup
      });
      if (res.data) {
        setSuccess(`Donor ${donorName} registered successfully under number: ${res.data.donor_number}`);
        setDonorName('');
        setDonorDob('');
        setDonorPhone('');
        setDonorEmail('');
        closeModal();
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register blood donor.');
    }
  };

  const handleRecordScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonor) return;
    setError(null);
    try {
      await apiClient.post(`/api/blood-bank/donors/${selectedDonor.id}/screening`, {
        hemoglobin: hb,
        weight,
        bp_sys: bpSys,
        bp_dia: bpDia,
        pulse,
        temperature: temp,
        eligible: screeningEligible,
        notes: screeningNotes || null
      });
      setSuccess(`Donor screening recorded. Eligibility status: ${screeningEligible ? 'ELIGIBLE' : 'INELIGIBLE'}`);
      setScreeningNotes('');
      closeModal();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record donor screening vitals.');
    }
  };

  const handleCollectDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonor) return;
    setError(null);
    try {
      const res = await apiClient.post(`/api/blood-bank/donors/${selectedDonor.id}/donate`, {
        volume_ml: donationVolume,
        technician: donationTechnician
      });
      if (res.data) {
        setSuccess(res.data.message);
        closeModal();
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to log donation.');
    }
  };

  const handleVerifyLabTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBag) return;
    setError(null);
    try {
      const res = await apiClient.post(`/api/blood-bank/donations/${selectedBag.bag_number}/testing`, {
        hiv_status: hiv,
        hepb_status: hepB,
        hepc_status: hepC,
        syphilis_status: syphilis,
        malaria_status: malaria,
        notes: labNotes || null
      });
      if (res.data) {
        setSuccess(res.data.message);
        setLabNotes('');
        closeModal();
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to log lab testing results.');
    }
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiClient.post('/api/blood-bank/requisitions', {
        patient_id: reqPatientId,
        blood_group: reqBloodGroup,
        component_type: reqComponent,
        units_requested: reqUnits,
        urgency: reqUrgency
      });
      if (res.data) {
        setSuccess(`Requisition registered under request code: ${res.data.request_number}`);
        setReqPatientId('');
        closeModal();
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register blood request.');
    }
  };

  const handleCrossmatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequisition) return;
    setError(null);
    try {
      const res = await apiClient.post(`/api/blood-bank/requisitions/${selectedRequisition.id}/crossmatch`, {
        bag_number: crossmatchBagNumber
      });
      if (res.data) {
        setSuccess(res.data.message);
        closeModal();
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Compatibility crossmatching failed.');
    }
  };

  const handleTransfusion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequisition) return;
    setError(null);
    try {
      const res = await apiClient.post(`/api/blood-bank/requisitions/${selectedRequisition.id}/transfuse`, {
        bag_number: transfusionBagNumber,
        started_at: new Date().toISOString(),
        ended_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour duration
        transfused_by: transfusedBy,
        bp_before: bpBefore,
        pulse_before: pulseBefore,
        temp_before: tempBefore,
        bp_after: bpAfter,
        pulse_after: pulseAfter,
        temp_after: tempAfter,
        reaction_logged: reactionLogged,
        reaction_details: reactionDetails || null
      });
      if (res.data) {
        setSuccess(res.data.message);
        setTransfusedBy('');
        setBpBefore('');
        setBpAfter('');
        setReactionLogged(false);
        setReactionDetails('');
        closeModal();
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to log transfusion.');
    }
  };

  const handleDiscardBag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBag) return;
    setError(null);
    try {
      const res = await apiClient.post('/api/blood-bank/stock/adjust', {
        bag_number: selectedBag.bag_number,
        action: 'discard',
        reason: discardReason
      });
      if (res.data) {
        setSuccess(res.data.message);
        setDiscardReason('');
        closeModal();
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to discard blood bag.');
    }
  };

  // Grouped Stock Summary Helper
  const getStockCount = (grp: string, comp: string) => {
    return stock.summary[`${grp}_${comp}`] || 0;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
            <Droplet className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Blood Bank Management</h1>
            <p className="text-slate-500 text-sm">Monitor available blood inventories, screen donors, log donation collections, and track recipient compatibility crossmatches.</p>
          </div>
        </div>
        <button
          onClick={() => openModal('add_donor')}
          className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow transition"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Donor</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Grid Stock Breakdown */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-md font-bold text-slate-800 flex items-center space-x-2">
          <Activity className="h-4 w-4 text-rose-500" />
          <span>Available Units Breakdown (Whole Blood / PRBC Component)</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => {
            const units = getStockCount(group, 'Whole Blood') + getStockCount(group, 'PRBC');
            return (
              <div key={group} className="border border-slate-100 rounded-xl p-4 text-center bg-slate-50/50 space-y-1 relative shadow-inner">
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-semibold text-slate-400 block">Group</span>
                <span className="text-xl font-black text-slate-800 block">{group}</span>
                <span className={`text-md font-bold block ${units > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                  {units} Unit{units !== 1 && 's'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'inventory', label: 'Blood Inventory', icon: Droplet },
          { id: 'donors', label: 'Donors Registry', icon: Users },
          { id: 'donations', label: 'Donations Laboratory', icon: ClipboardCheck },
          { id: 'requisitions', label: 'Recipient Requests', icon: FileText },
          { id: 'alerts', label: 'Emergency Alerts', icon: ShieldAlert }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 font-semibold text-sm border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-rose-600 text-rose-600 bg-rose-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Body */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white rounded-xl border border-slate-100 shadow-sm">
          <Loader2 className="h-8 w-8 text-rose-600 animate-spin" />
          <p className="text-slate-500 text-sm">Accessing blood bank registries...</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          {/* TAB 1: INVENTORY */}
          {activeTab === 'inventory' && (
            <div data-tour="blood-inventory" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Available Blood Bags</h3>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                  Total Bags: {stock.bags.length}
                </span>
              </div>
              {stock.bags.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg text-slate-400">
                  No active blood units available in current branch inventory.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <th className="p-3">Bag ID</th>
                        <th className="p-3">Blood Group</th>
                        <th className="p-3">Component Type</th>
                        <th className="p-3">Volume</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Expiry Date</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stock.bags.map((bag) => (
                        <tr key={bag.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-700">{bag.bag_number}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full font-extrabold text-xs">
                              {bag.blood_group}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-600">{bag.component_type}</td>
                          <td className="p-3 text-slate-500">{bag.volume_ml} ml</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              bag.status === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {bag.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-xs">
                            {new Date(bag.expiry_date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => openModal('discard', undefined, bag)}
                              className="text-slate-400 hover:text-rose-600 transition p-1"
                              title="Discard unit"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DONORS */}
          {activeTab === 'donors' && (
            <div data-tour="blood-donors" className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Donor Directory</h3>
              {donors.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg text-slate-400">
                  No donors registered. Use "Register New Donor" to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <th className="p-3">Donor No.</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Group</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">Gender / Age</th>
                        <th className="p-3">Eligibility</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {donors.map((donor) => {
                        const isEligible = donor.screening_vitals?.eligible;
                        return (
                          <tr key={donor.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-slate-700">{donor.donor_number}</td>
                            <td className="p-3 font-bold text-slate-800">{donor.name}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded font-extrabold text-xs">
                                {donor.blood_group}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">{donor.phone}</td>
                            <td className="p-3 text-slate-500">
                              {donor.gender} / {new Date().getFullYear() - new Date(donor.dob).getFullYear()} yrs
                            </td>
                            <td className="p-3">
                              {donor.screening_vitals ? (
                                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  isEligible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {isEligible ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                  <span>{isEligible ? 'Eligible' : 'Ineligible'}</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-semibold">
                                  Not Screened
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                onClick={() => openModal('screen_donor', donor)}
                                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded transition"
                              >
                                Screening
                              </button>
                              <button
                                onClick={() => openModal('donate', donor)}
                                disabled={!isEligible}
                                className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 disabled:bg-slate-50 text-rose-700 disabled:text-slate-300 font-bold rounded transition"
                              >
                                Collect
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DONATIONS */}
          {activeTab === 'donations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Donation Logs & Laboratory Screenings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                      <th className="p-3">Bag ID</th>
                      <th className="p-3">Donation Date</th>
                      <th className="p-3">Collected Vol</th>
                      <th className="p-3">Technician</th>
                      <th className="p-3">Infectious Screen Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stock.bags.map((bag) => (
                      <tr key={bag.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-700">{bag.bag_number}</td>
                        <td className="p-3 text-slate-500 font-mono text-xs">
                          {new Date(bag.expiry_date).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-slate-500">{bag.volume_ml} ml</td>
                        <td className="p-3 text-slate-600 font-semibold">Staff Lab Tech</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                            bag.status === 'testing_pending' ? 'bg-amber-100 text-amber-800' :
                            bag.status === 'discarded' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {bag.status === 'testing_pending' ? 'Pending Lab Result' :
                             bag.status === 'discarded' ? 'Reactive / Discarded' : 'Verified Cleared'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {bag.status === 'testing_pending' && (
                            <button
                              onClick={() => openModal('lab_test', undefined, bag)}
                              className="px-2.5 py-1 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold rounded transition"
                            >
                              Verify Infectious Tests
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: REQUISITIONS */}
          {activeTab === 'requisitions' && (
            <div data-tour="blood-requisitions" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Clinical Blood Requests</h3>
                <button
                  onClick={() => openModal('requisition')}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Requisition</span>
                </button>
              </div>
              {requisitions.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg text-slate-400">
                  No pending patient requisitions recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <th className="p-3">Req No.</th>
                        <th className="p-3">Recipient Patient</th>
                        <th className="p-3">Type Required</th>
                        <th className="p-3">Volume Units</th>
                        <th className="p-3">Urgency</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Crossmatched Bags</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requisitions.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-700">{req.request_number}</td>
                          <td className="p-3 font-bold text-slate-800">{req.patient_name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded font-bold text-xs">
                              {req.blood_group}
                            </span>
                            <span className="text-xs text-slate-400 ml-1.5 font-medium">({req.component_type})</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-600">{req.units_requested} Unit(s)</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                              req.urgency === 'stat' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                              req.urgency === 'urgent' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {req.urgency}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${
                              req.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                              req.status === 'crossmatched' ? 'bg-indigo-50 text-indigo-700' :
                              req.status === 'transfused' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-slate-500 font-mono">
                            {req.allocated_bags.length > 0 ? req.allocated_bags.join(', ') : 'None'}
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            {req.status === 'pending' && (
                              <button
                                onClick={() => openModal('crossmatch', undefined, undefined, req)}
                                className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition"
                              >
                                Crossmatch
                              </button>
                            )}
                            {req.status === 'crossmatched' && (
                              <button
                                onClick={() => openModal('transfuse', undefined, undefined, req)}
                                className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition"
                              >
                                Transfuse
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EMERGENCY BUZZER ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Emergency Donation Broadcast Alarms</h3>
                <p className="text-slate-500 text-xs mt-0.5">Send a real-time high-priority buzzer alarm to patient mobile apps and portals matching the requested blood group.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Broadcast form control panel */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="font-extrabold text-slate-700 text-sm flex items-center space-x-2">
                    <Droplet className="h-4 w-4 text-rose-600" />
                    <span>Configure Alert Broadcast</span>
                  </h4>
                  
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Select Target Blood Group</label>
                    <select
                      value={alertBloodGroup}
                      onChange={(e) => setAlertBloodGroup(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white font-bold text-rose-700 focus:outline-none"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((gp) => (
                        <option key={gp} value={gp}>{gp}</option>
                      ))}
                    </select>
                  </div>

                  {!activeBuzzerId ? (
                    <button
                      onClick={handleStartBroadcast}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                      Trigger Emergency Buzzer Alert
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-855 text-center animate-pulse">
                        📢 Alert Active: Requesting {activeBuzzerGroup}
                      </div>
                      <button
                        onClick={handleStopBroadcast}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        Stop / Deactivate Buzzer
                      </button>
                    </div>
                  )}
                </div>

                {/* Real-time Responders List */}
                <div className="md:col-span-2 bg-slate-50/50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-inner min-h-[250px]">
                  <h4 className="font-extrabold text-slate-800 text-sm flex justify-between items-center">
                    <span>Active Responding Donors</span>
                    {activeBuzzerId && (
                      <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] rounded-full uppercase font-black animate-pulse">
                        Real-time Socket Feed
                      </span>
                    )}
                  </h4>

                  {responderList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
                      <span>No accepts reported yet. Awaiting donor actions...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {responderList.map((resp, idx) => (
                        <div key={idx} className="border border-emerald-100 bg-white rounded-xl p-4 space-y-2 relative shadow-sm">
                          <div className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded">
                            {resp.blood_group}
                          </div>
                          <div className="font-extrabold text-slate-800 text-sm">{resp.patient_name}</div>
                          <div className="text-xs text-slate-500 flex items-center space-x-1 font-medium">
                            <span>📞 {resp.phone}</span>
                          </div>
                          <div className="text-xs text-slate-400 font-medium">📧 {resp.email}</div>
                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                            <span>Responded: {new Date(resp.time).toLocaleTimeString()}</span>
                            <a
                              href={`tel:${resp.phone}`}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition"
                            >
                              Call Now
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================
          MODAL SCREENS OVERLAY (HTML5 DOM Pop-ups)
          ================================================================== */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform scale-100 transition-all">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 p-5 bg-slate-50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <Droplet className="h-5 w-5 text-rose-600" />
                <span>
                  {activeModal === 'add_donor' && 'Register New Donor'}
                  {activeModal === 'screen_donor' && `Screen Donor - ${selectedDonor?.name}`}
                  {activeModal === 'donate' && `Collect Blood Bag - ${selectedDonor?.name}`}
                  {activeModal === 'lab_test' && `Infectious Disease Log - Bag ${selectedBag?.bag_number}`}
                  {activeModal === 'requisition' && 'New Recipient Requisition'}
                  {activeModal === 'crossmatch' && `Type Match Allocation - Request ${selectedRequisition?.request_number}`}
                  {activeModal === 'transfuse' && `Log Patient Transfusion - Request ${selectedRequisition?.request_number}`}
                  {activeModal === 'discard' && `Confirm Discard - Bag ${selectedBag?.bag_number}`}
                </span>
              </h3>
              <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body / Forms */}
            <div className="p-6">
              {/* FORM A: ADD DONOR */}
              {activeModal === 'add_donor' && (
                <form onSubmit={handleAddDonor} className="space-y-4">
                  <FormField label="Donor Full Name" value={donorName} onChange={(e) => setDonorName(e.target.value)} required placeholder="e.g. John Doe" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-slate-700">Gender</label>
                      <select value={donorGender} onChange={(e) => setDonorGender(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white">
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <FormField label="Date of Birth" type="date" value={donorDob} onChange={(e) => setDonorDob(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Phone Number" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} required placeholder="10-12 digits" />
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-slate-700">Blood Group</label>
                      <select value={donorGroup} onChange={(e) => setDonorGroup(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-bold text-rose-700">
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((gp) => (
                          <option key={gp}>{gp}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <FormField label="Email Address" type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} placeholder="optional" />
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition text-sm">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition text-sm flex items-center space-x-1">
                      <Save className="h-4 w-4" />
                      <span>Save Donor Record</span>
                    </button>
                  </div>
                </form>
              )}

              {/* FORM B: RECORD SCREENING */}
              {activeModal === 'screen_donor' && (
                <form onSubmit={handleRecordScreening} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField label="Hemoglobin (g/dL)" type="number" value={hb} onChange={(e) => setHb(parseFloat(e.target.value))} required step="0.1" />
                    <FormField label="Weight (kg)" type="number" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value))} required />
                    <FormField label="Temp (F)" type="number" value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} required step="0.1" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField label="BP Systolic" type="number" value={bpSys} onChange={(e) => setBpSys(parseInt(e.target.value))} required />
                    <FormField label="BP Diastolic" type="number" value={bpDia} onChange={(e) => setBpDia(parseInt(e.target.value))} required />
                    <FormField label="Pulse (bpm)" type="number" value={pulse} onChange={(e) => setPulse(parseInt(e.target.value))} required />
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg">
                    <input
                      type="checkbox"
                      id="elig_check"
                      checked={screeningEligible}
                      onChange={(e) => setScreeningEligible(e.target.checked)}
                      className="h-4 w-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500"
                    />
                    <label htmlFor="elig_check" className="text-sm font-semibold text-slate-700">Donor meets general physical requirements & screening questionnaire criteria</label>
                  </div>

                  <FormField label="Screening Notes / Contraindications" value={screeningNotes} onChange={(e) => setScreeningNotes(e.target.value)} placeholder="Describe any clinical reasons if ineligible..." />

                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition text-sm">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition text-sm">Save Screening Results</button>
                  </div>
                </form>
              )}

              {/* FORM C: LOG DONATION */}
              {activeModal === 'donate' && (
                <form onSubmit={handleCollectDonation} className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Blood Group:</span>
                      <span className="font-bold text-rose-600">{selectedDonor?.blood_group}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hb Levels:</span>
                      <span className="font-bold">{selectedDonor?.screening_vitals?.hemoglobin} g/dL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Attending Check:</span>
                      <span className="text-emerald-600 font-semibold">ELIGIBLE</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-slate-700">Bag Unit Volume</label>
                    <select value={donationVolume} onChange={(e) => setDonationVolume(parseInt(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-semibold">
                      <option value="350">Single Bag (350 ml)</option>
                      <option value="450">Double Bag (450 ml)</option>
                    </select>
                  </div>

                  <FormField label="Phlebotomy Technician Name" value={donationTechnician} onChange={(e) => setDonationTechnician(e.target.value)} required placeholder="Enter nurse/technician name" />

                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition text-sm">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition text-sm">Complete Blood Collection</button>
                  </div>
                </form>
              )}

              {/* FORM D: LAB TESTING OUTCOME */}
              {activeModal === 'lab_test' && (
                <form onSubmit={handleVerifyLabTest} className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700 border-b pb-1">Serological Screening Rapid Panels</h4>
                    {[
                      { label: 'HIV Antibody Screen', value: hiv, setter: setHiv },
                      { label: 'Hepatitis B Surface Antigen', value: hepB, setter: setHepB },
                      { label: 'Hepatitis C Virus Screen', value: hepC, setter: setHepC },
                      { label: 'Syphilis Test VDRL', value: syphilis, setter: setSyphilis },
                      { label: 'Malaria Smear / Antigen', value: malaria, setter: setMalaria }
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600 font-medium">{item.label}</span>
                        <div className="flex space-x-2">
                          {['Non-Reactive', 'Reactive'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => item.setter(opt)}
                              className={`px-3 py-1 text-xs font-bold rounded-md border transition ${
                                item.value === opt
                                  ? opt === 'Reactive'
                                    ? 'bg-rose-500 text-white border-rose-500'
                                    : 'bg-emerald-500 text-white border-emerald-500'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <FormField label="Lab Testing Comments" value={labNotes} onChange={(e) => setLabNotes(e.target.value)} placeholder="Add any details about repeat tests..." />

                  { (hiv === 'Reactive' || hepB === 'Reactive' || hepC === 'Reactive' || syphilis === 'Reactive' || malaria === 'Reactive') && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start space-x-2 text-rose-700 text-xs">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <div>
                        <span className="font-bold">Reactive Warning:</span> Marking any screening test as Reactive will flag this blood unit as infectious, automatically discarding it from active stock.
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition text-sm">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition text-sm">Approve & Release Unit</button>
                  </div>
                </form>
              )}

              {/* FORM E: CREATE REQUISITION */}
              {activeModal === 'requisition' && (
                <form onSubmit={handleCreateRequisition} className="space-y-4">
                  <FormField label="Patient Profile ID (MongoDB Object ID)" value={reqPatientId} onChange={(e) => setReqPatientId(e.target.value)} required placeholder="e.g. 64c39..." />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-slate-700">Required Group</label>
                      <select value={reqBloodGroup} onChange={(e) => setReqBloodGroup(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-bold text-rose-700">
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((gp) => (
                          <option key={gp}>{gp}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-slate-700">Component Required</label>
                      <select value={reqComponent} onChange={(e) => setReqComponent(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white">
                        {['Whole Blood', 'PRBC', 'FFP', 'Platelets', 'Cryoprecipitate'].map((comp) => (
                          <option key={comp}>{comp}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Units Required" type="number" value={reqUnits} onChange={(e) => setReqUnits(parseInt(e.target.value))} required min={1} max={10} />
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-slate-700">Priority Level</label>
                      <select value={reqUrgency} onChange={(e) => setReqUrgency(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white uppercase font-bold text-slate-700">
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT / Immediate</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition text-sm">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition text-sm">Submit Requisition</button>
                  </div>
                </form>
              )}

              {/* FORM F: CROSSMATCH */}
              {activeModal === 'crossmatch' && (
                <form onSubmit={handleCrossmatch} className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Patient:</span>
                      <span className="font-bold text-slate-800">{selectedRequisition?.patient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Required Group:</span>
                      <span className="font-extrabold text-rose-700">{selectedRequisition?.blood_group} ({selectedRequisition?.component_type})</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Select Available Compatible Blood Bag</label>
                    <select
                      value={crossmatchBagNumber}
                      onChange={(e) => setCrossmatchBagNumber(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-mono"
                    >
                      <option value="">-- Choose compatible bag --</option>
                      {stock.bags
                        .filter(bag => bag.status === 'available')
                        .map(bag => (
                          <option key={bag.id} value={bag.bag_number}>
                            {bag.bag_number} [Group {bag.blood_group}] - {bag.component_type} ({bag.volume_ml} ml)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition text-sm">Cancel</button>
                    <button type="submit" disabled={!crossmatchBagNumber} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition text-sm disabled:opacity-50">
                      Verify & Allocate Unit
                    </button>
                  </div>
                </form>
              )}

              {/* FORM G: TRANSFUSION */}
              {activeModal === 'transfuse' && (
                <form onSubmit={handleTransfusion} className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Patient Recipient:</span>
                      <span className="font-bold">{selectedRequisition?.patient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Allocated Blood Bag(s):</span>
                      <span className="font-mono text-slate-600">{selectedRequisition?.allocated_bags.join(', ')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-slate-700">Select Bag to Transfuse</label>
                      <select value={transfusionBagNumber} onChange={(e) => setTransfusionBagNumber(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-mono">
                        {selectedRequisition?.allocated_bags.map((bag) => (
                          <option key={bag} value={bag}>{bag}</option>
                        ))}
                      </select>
                    </div>
                    <FormField label="Transfusing Nurse / Doctor" value={transfusedBy} onChange={(e) => setTransfusedBy(e.target.value)} required placeholder="Staff identifier" />
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 border-b pb-1">Pre-Transfusion Baseline Vitals</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <FormField label="BP (e.g. 120/80)" value={bpBefore} onChange={(e) => setBpBefore(e.target.value)} required placeholder="BP" />
                      <FormField label="Pulse (bpm)" type="number" value={pulseBefore} onChange={(e) => setPulseBefore(parseInt(e.target.value))} required />
                      <FormField label="Temp (F)" type="number" value={tempBefore} onChange={(e) => setTempBefore(parseFloat(e.target.value))} required step="0.1" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 border-b pb-1">Post-Transfusion / Reaction Vitals</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <FormField label="BP (e.g. 115/75)" value={bpAfter} onChange={(e) => setBpAfter(e.target.value)} required placeholder="BP" />
                      <FormField label="Pulse (bpm)" type="number" value={pulseAfter} onChange={(e) => setPulseAfter(parseInt(e.target.value))} required />
                      <FormField label="Temp (F)" type="number" value={tempAfter} onChange={(e) => setTempAfter(parseFloat(e.target.value))} required step="0.1" />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg">
                    <input
                      type="checkbox"
                      id="react_check"
                      checked={reactionLogged}
                      onChange={(e) => setReactionLogged(e.target.checked)}
                      className="h-4 w-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500"
                    />
                    <label htmlFor="react_check" className="text-sm font-semibold text-slate-700">Patient experienced a transfusion reaction during unit infusion</label>
                  </div>

                  {reactionLogged && (
                    <FormField label="Reaction Details" value={reactionDetails} onChange={(e) => setReactionDetails(e.target.value)} required placeholder="Describe symptoms (e.g. urticaria, chills, dyspnea, fever spike)..." />
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition text-sm">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition text-sm">Complete Transfusion Log</button>
                  </div>
                </form>
              )}

              {/* FORM H: DISCARD BAG */}
              {activeModal === 'discard' && (
                <form onSubmit={handleDiscardBag} className="space-y-4">
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-rose-700 text-sm space-y-2">
                    <div className="font-bold flex items-center space-x-1">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>Warning: Irreversible Action</span>
                    </div>
                    <p className="text-xs">Discarding blood bag {selectedBag?.bag_number} will mark it as discarded in inventory records. Reason for discard must be documented.</p>
                  </div>

                  <FormField label="Reason for Discarding Unit" value={discardReason} onChange={(e) => setDiscardReason(e.target.value)} required placeholder="e.g. Expired unit, physical damage, cold-chain violation..." />

                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition text-sm">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition text-sm flex items-center space-x-1">
                      <Trash2 className="h-4 w-4" />
                      <span>Confirm Discard</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default BloodBankDashboard;
