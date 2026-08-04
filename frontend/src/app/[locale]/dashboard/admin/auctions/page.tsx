'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAuctions, 
  createAuction, 
  closeAuction, 
  getAuctionMessages, 
  sendAuctionMessage,
  uploadAuctionImage,
  Auction 
} from '@/lib/api';
import { 
  Loader2, 
  Plus, 
  Gavel, 
  Clock, 
  CheckCircle, 
  X, 
  MessageSquare, 
  Send, 
  BadgeCheck,
  Upload,
  Image as ImageIcon 
} from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function AuctionsAdminModule() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [activeChatAuction, setActiveChatAuction] = useState<Auction | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [auctionType, setAuctionType] = useState<'ADOPTABLE' | 'COMMISSION_SLOT'>('ADOPTABLE');
  const [startingBid, setStartingBid] = useState('');
  const [bidIncrement, setBidIncrement] = useState('50');
  const [autoBuy, setAutoBuy] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [durationHours, setDurationHours] = useState('24');
  const [isUploading, setIsUploading] = useState(false);

  const { data: auctions = [], isLoading: loadingAuctions } = useQuery({
    queryKey: ['auctions'],
    queryFn: getAuctions,
  });

  // Fetch messages for active chat auction
  const { data: activeChatMessages = [], isLoading: loadingChat } = useQuery({
    queryKey: ['auction-messages', activeChatAuction?.id],
    queryFn: () => getAuctionMessages(activeChatAuction!.id),
    enabled: !!activeChatAuction?.id,
    refetchInterval: 3000,
  });

  // Reply Mutation
  const sendReplyMutation = useMutation({
    mutationFn: (text: string) => sendAuctionMessage(activeChatAuction!.id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction-messages', activeChatAuction?.id] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      setAdminReplyText('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to send reply');
    }
  });

  const createAuctionMutation = useMutation({
    mutationFn: (data: Parameters<typeof createAuction>[0]) => createAuction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      setShowModal(false);
      resetForm();
      alert('เปิดเวทีประมูลใหม่สำเร็จแล้ว!');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'เกิดข้อผิดพลาดในการสร้างรายการประมูล';
      alert(msg);
    }
  });

  const closeAuctionMutation = useMutation({
    mutationFn: (id: number) => closeAuction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAuctionType('ADOPTABLE');
    setStartingBid('');
    setBidIncrement('50');
    setAutoBuy('');
    setImageFile(null);
    setDurationHours('24');
    setIsUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startingBid || parseFloat(startingBid) <= 0) {
      alert('กรุณาระบุราคาเริ่มต้น (Starting Bid) ให้ถูกต้อง');
      return;
    }

    let finalImageUrl = '';

    if (imageFile) {
      setIsUploading(true);
      try {
        const uploaded = await uploadAuctionImage(imageFile);
        finalImageUrl = uploaded.image_url;
      } catch (err: any) {
        setIsUploading(false);
        alert('อัปโหลดไฟล์ภาพล้มเหลว: ' + (err.response?.data?.detail || 'รูปแบบไฟล์ไม่ถูกต้อง'));
        return;
      }
      setIsUploading(false);
    } else {
      alert('กรุณาเลือกไฟล์รูปภาพสำหรับสร้างประมูล');
      return;
    }

    const hours = parseFloat(durationHours) || 24;
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    createAuctionMutation.mutate({
      title,
      description,
      auction_type: auctionType,
      starting_bid: parseFloat(startingBid),
      bid_increment: parseFloat(bidIncrement) || 50,
      auto_buy: autoBuy ? parseFloat(autoBuy) : undefined,
      image_url: finalImageUrl || undefined,
      start_time: startTime,
      end_time: endTime,
    });
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeChatAuction) return;
    sendReplyMutation.mutate(adminReplyText.trim());
  };

  if (loadingAuctions) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-neutral-900 border border-neutral-800 rounded-3xl">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Loading Auctions Control...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-xs">
        <div>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">Auction Stage Control</span>
          <h2 className="text-2xl font-extrabold text-white">Live Bids & Adoptable Hosting</h2>
          <p className="text-xs text-neutral-400 mt-1">Host adoptable character sales or auction high-demand commission slots.</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" /> Host New Auction
        </button>
      </div>

      {/* Auctions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {auctions.map((auc) => (
          <div key={auc.id} className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between">
            {auc.image_url && (
              <div className="aspect-video bg-neutral-950 border-b border-neutral-800 overflow-hidden relative">
                <img
                  src={auc.image_url.startsWith('/') ? `http://127.0.0.1:8000${auc.image_url}` : auc.image_url}
                  alt={auc.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-neutral-950 text-blue-400 border-neutral-800">
                  {auc.auction_type}
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  auc.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}>
                  {auc.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white truncate">{auc.title}</h3>
                <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{auc.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950 p-3 rounded-2xl border border-neutral-800 font-mono">
                <div>
                  <span className="text-[9px] text-neutral-400 block uppercase font-bold">Start Bid</span>
                  <span className="text-white font-bold">฿{auc.starting_bid}</span>
                </div>
                <div>
                  <span className="text-[9px] text-neutral-400 block uppercase font-bold">Current</span>
                  <span className="text-emerald-400 font-bold">฿{auc.winning_bid || auc.starting_bid}</span>
                </div>
              </div>

              {/* Action Buttons: Q&A Chat & Close */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setActiveChatAuction(auc)}
                  className="flex-1 py-2 px-3 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> แชทตอบคำถาม
                </button>
                {auc.status === 'ACTIVE' && (
                  <button
                    onClick={() => closeAuctionMutation.mutate(auc.id)}
                    disabled={closeAuctionMutation.isPending}
                    className="py-2 px-3 bg-neutral-950 hover:bg-rose-900/30 text-rose-400 border border-neutral-800 hover:border-rose-700/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    ปิดประมูล
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Inquiry Q&A Chat Drawer / Modal */}
      {activeChatAuction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-white flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" /> ตอบคำถามลูกค้า ({activeChatAuction.title})
                </h3>
                <p className="text-[11px] text-neutral-400">คำถามสอบถามจากลูกค้าในหน้ารายละเอียดการประมูล</p>
              </div>
              <button
                onClick={() => setActiveChatAuction(null)}
                className="text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto space-y-3 p-1 min-h-[250px] no-scrollbar">
              {activeChatMessages.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 space-y-1">
                  <MessageSquare className="w-8 h-8 text-neutral-700 mx-auto" />
                  <p className="text-xs font-bold">ยังไม่มีคำถามสอบถามในรายการนี้</p>
                </div>
              ) : (
                activeChatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-2xl border text-xs space-y-1 ${
                      msg.is_artist
                        ? 'bg-purple-950/40 border-purple-500/40 ml-4'
                        : 'bg-neutral-950 border-neutral-800 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-bold ${msg.is_artist ? 'text-purple-300 flex items-center gap-1' : 'text-white'}`}>
                        {msg.is_artist && <BadgeCheck className="w-3.5 h-3.5 text-purple-400" />}
                        {msg.sender_name} {msg.is_artist && '(ศิลปิน)'}
                      </span>
                      <span className="text-[9px] text-neutral-500 font-mono">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-neutral-200">{msg.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Admin Reply Form */}
            <form onSubmit={handleSendReply} className="flex gap-2 border-t border-neutral-800 pt-3">
              <input
                type="text"
                required
                placeholder="พิมพ์คำตอบในฐานะศิลปิน..."
                value={adminReplyText}
                onChange={(e) => setAdminReplyText(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={sendReplyMutation.isPending || !adminReplyText.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {sendReplyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                ตอบกลับ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Host New Auction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto no-scrollbar">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-white">Host New Auction / Adoptable</h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Cyberpunk Adoptable #04"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 font-bold uppercase block mb-1">Auction Type</label>
                  <select
                    value={auctionType}
                    onChange={(e) => setAuctionType(e.target.value as 'ADOPTABLE' | 'COMMISSION_SLOT')}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="ADOPTABLE">ADOPTABLE ARTWORK</option>
                    <option value="COMMISSION_SLOT">COMMISSION SLOT</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 font-bold uppercase block mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-neutral-400 font-bold uppercase block mb-1">Start Bid (฿) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="100"
                    value={startingBid}
                    onChange={(e) => setStartingBid(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 font-bold uppercase block mb-1">Step (฿)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={bidIncrement}
                    onChange={(e) => setBidIncrement(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 font-bold uppercase block mb-1">AutoBuy (฿)</label>
                  <input
                    type="number"
                    placeholder="Optional"
                    value={autoBuy}
                    onChange={(e) => setAutoBuy(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload Image File */}
              <div className="space-y-2 bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
                <label className="text-neutral-300 font-bold uppercase block text-[11px]">Artwork Preview Image (รูปภาพประกอบ)</label>
                
                <div className="flex items-center gap-2">
                  <label className="flex-1 border border-dashed border-neutral-700 hover:border-blue-500 rounded-xl p-2.5 flex items-center justify-center gap-2 cursor-pointer bg-neutral-900 transition-colors">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-neutral-300 truncate">
                      {imageFile ? imageFile.name : 'อัปโหลดไฟล์ภาพจากเครื่อง'}
                    </span>
                    <input type="file" accept="image/*" required onChange={handleFileSelect} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">Terms & Adoptable Rights (รายละเอียดเพิ่มเติม)</label>
                <textarea
                  rows={3}
                  placeholder="รวมสิทธิ์การนำไปใช้เชิงพาณิชย์..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={createAuctionMutation.isPending || isUploading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl transition-all shadow-xs cursor-pointer mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(createAuctionMutation.isPending || isUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                {isUploading ? 'กำลังอัปโหลดรูปภาพ...' : 'เปิดเวทีประมูลใหม่ (Launch Auction)'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
