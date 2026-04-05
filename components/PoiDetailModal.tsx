import React, { useState, useEffect, useCallback } from 'react';
import { X, Fuel, Star, MapPin, Phone, Globe, Clock, GitMerge, CircleDollarSign, Navigation as NavIcon, ListOrdered, Send, Tag } from 'lucide-react';
import { TruckStopReputation } from './ReputationScore';

interface FacilityRating {
  rating: number;
  review?: string;
  tags?: string[];
  userName?: string;
  createdAt: string;
}

interface PoiDetailModalProps {
  selectedPoi: any;
  onClose: () => void;
  fuelStations: any[];
  matchFuelStationToPoi: (s: any, lat: number, lon: number) => boolean;
  findCheapestDiesel: (stations: any[]) => any;
  poiParkingStatus: { status: string | null; updatedAt: string | null; updateCount: number } | null;
  isParkingLoading: boolean;
  parkingSubmitDone: string | null;
  submitParkingStatus: (status: string) => void;
  addWaypoint: (poi: any, type: string, position?: number) => void;
  handleNavigate: (query?: string, coords?: { lat: number; lon: number }) => Promise<void>;
  waypointCount?: number;
}

export const PoiDetailModal: React.FC<PoiDetailModalProps> = ({
  selectedPoi, onClose, fuelStations, matchFuelStationToPoi, findCheapestDiesel,
  poiParkingStatus, isParkingLoading, parkingSubmitDone, submitParkingStatus,
  addWaypoint, handleNavigate, waypointCount = 0,
}) => {
  const [stopPosition, setStopPosition] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [facilityRatings, setFacilityRatings] = useState<{ averageRating: number; totalReviews: number; ratings: FacilityRating[] }>({ averageRating: 0, totalReviews: 0, ratings: [] });
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const REVIEW_TAGS = ['Clean Restrooms', 'Good Food', 'Safe Parking', 'Fast Fuel', 'Friendly Staff', 'Showers', 'Truck Wash', 'WiFi'];
  
  const poiId = selectedPoi ? `${selectedPoi.lat.toFixed(4)}_${selectedPoi.lon.toFixed(4)}` : '';
  
  const fetchRatings = useCallback(async () => {
    if (!poiId) return;
    setRatingsLoading(true);
    try {
      const res = await fetch(`/api/facility-ratings?poiId=${encodeURIComponent(poiId)}`);
      const data = await res.json();
      setFacilityRatings(data);
    } catch { } finally { setRatingsLoading(false); }
  }, [poiId]);
  
  useEffect(() => { fetchRatings(); }, [fetchRatings]);
  
  const submitRating = async () => {
    if (!userRating || !selectedPoi) return;
    try {
      const res = await fetch('/api/facility-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poiId,
          rating: userRating,
          review: reviewText || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          name: selectedPoi.name,
          lat: selectedPoi.lat,
          lon: selectedPoi.lon,
        }),
      });
      if (res.ok) {
        setRatingSubmitted(true);
        setShowReviewForm(false);
        fetchRatings();
      }
    } catch { }
  };
  
  if (!selectedPoi) return null;

  return (
    <div className="absolute inset-0 z-[4000] flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-black border border-[#D4AF37]/30 rounded-2xl md:rounded-[2.5rem] landscape:rounded-2xl w-full max-w-md overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 max-h-[calc(100vh-4rem)] flex flex-col transition-all hover:scale-[1.005]">
        {/* Header */}
        <div className="relative h-24 md:h-32 landscape:h-16 shrink-0 bg-gradient-to-br from-[#D4AF37]/20 to-black border-b border-white/5 p-4 md:p-8 landscape:p-4 flex items-end justify-between">
          <div>
            <h3 className="text-lg md:text-2xl landscape:text-lg font-black text-white uppercase tracking-tight leading-tight">{selectedPoi.name}</h3>
            <p className="text-[10px] landscape:text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest mt-1 landscape:mt-0">{selectedPoi.type}</p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 landscape:top-2 landscape:right-2 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
            <X className="w-5 h-5 landscape:w-4 landscape:h-4" />
          </button>
        </div>
        
        <div className="p-4 md:p-8 landscape:p-4 space-y-4 md:space-y-8 landscape:space-y-3 overflow-y-auto custom-scrollbar">
          {/* Diesel Price Banner */}
          {(() => {
            const matchedStation = fuelStations.find(s => matchFuelStationToPoi(s, selectedPoi.lat, selectedPoi.lon));
            if (!matchedStation?.dieselPrice) return null;
            const cheapest = findCheapestDiesel(fuelStations);
            const isCheapest = cheapest && matchedStation.id === cheapest.id;
            return (
              <div data-testid="poi-diesel-price" className={`flex items-center justify-between p-3 md:p-4 rounded-2xl landscape:rounded-xl border ${isCheapest ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isCheapest ? 'bg-[#D4AF37]/20' : 'bg-[#D4AF37]/15'}`}>
                    <Fuel className={`w-5 h-5 ${isCheapest ? 'text-[#D4AF37]' : 'text-[#D4AF37]'}`} />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Diesel Price</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black tabular-nums ${isCheapest ? 'text-[#D4AF37]' : 'text-white'}`}>
                        ${matchedStation.dieselPrice.toFixed(3)}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-bold">/gal</span>
                    </div>
                  </div>
                </div>
                {isCheapest && (
                  <span className="text-[8px] font-black uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/15 px-3 py-1.5 rounded-full">Best Price</span>
                )}
                {matchedStation.lastUpdated && (
                  <span className="text-[7px] text-zinc-600 font-medium">{new Date(matchedStation.lastUpdated).toLocaleDateString()}</span>
                )}
              </div>
            );
          })()}

          {/* Amenities */}
          {selectedPoi.amenities && selectedPoi.amenities.length > 0 && (
            <div>
              <h4 className="text-[10px] landscape:text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2 md:mb-4 landscape:mb-2 flex items-center gap-2">
                <Star className="w-3 h-3 landscape:w-2 landscape:h-2 text-[#D4AF37]" /> Available Amenities
              </h4>
              <div className="grid grid-cols-2 gap-2 md:gap-3 landscape:gap-1.5">
                {selectedPoi.amenities.map((amenity: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 md:gap-3 landscape:gap-1.5 bg-white/5 p-2 md:p-3 landscape:p-1.5 rounded-xl landscape:rounded-lg border border-white/5">
                    <div className="w-1.5 h-1.5 landscape:w-1 landscape:h-1 rounded-full bg-[#D4AF37]" />
                    <span className="text-xs landscape:text-[9px] font-bold text-zinc-300">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entrance/Exit */}
          {selectedPoi.entrance && (
            <div className="mt-4">
              <h4 className="text-[10px] landscape:text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <MapPin className="w-3 h-3 landscape:w-2 landscape:h-2 text-[#D4AF37]" /> Entrance
              </h4>
              <p className="text-xs landscape:text-[9px] font-bold text-zinc-300 bg-white/5 p-2 rounded-xl">{selectedPoi.entrance.lat.toFixed(6)}, {selectedPoi.entrance.lon.toFixed(6)}</p>
            </div>
          )}
          {selectedPoi.exit && (
            <div className="mt-4">
              <h4 className="text-[10px] landscape:text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <MapPin className="w-3 h-3 landscape:w-2 landscape:h-2 text-[#D4AF37]" /> Exit
              </h4>
              <p className="text-xs landscape:text-[9px] font-bold text-zinc-300 bg-white/5 p-2 rounded-xl">{selectedPoi.exit.lat.toFixed(6)}, {selectedPoi.exit.lon.toFixed(6)}</p>
            </div>
          )}

          {/* Contact & Hours */}
          {(selectedPoi.phone || selectedPoi.website || selectedPoi.openingHours) && (
            <div className="grid grid-cols-1 gap-3">
              {selectedPoi.phone && (
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                  <Phone className="w-4 h-4 text-[#D4AF37]" />
                  <a href={`tel:${selectedPoi.phone}`} className="text-xs font-bold text-zinc-300 hover:text-white transition-colors">{selectedPoi.phone}</a>
                </div>
              )}
              {selectedPoi.website && (
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                  <Globe className="w-4 h-4 text-[#D4AF37]" />
                  <a href={selectedPoi.website} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-zinc-300 hover:text-white transition-colors truncate">{selectedPoi.website}</a>
                </div>
              )}
              {selectedPoi.openingHours && (
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                  <Clock className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-bold text-zinc-300">{selectedPoi.openingHours}</span>
                </div>
              )}
            </div>
          )}

          {/* Reputation Score */}
          <div data-testid="truckstop-reputation-section" className="border border-[#D4AF37]/20 rounded-2xl landscape:rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37]/8 border-b border-[#D4AF37]/15">
              <svg className="w-4 h-4 text-[#D4AF37]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span className="text-[10px] landscape:text-[8px] font-black text-[#D4AF37] uppercase tracking-widest">Truck Stop Reputation</span>
            </div>
            <div className="px-4 py-3 landscape:py-2">
              <TruckStopReputation parkingStatus={poiParkingStatus?.status as any} updateCount={poiParkingStatus?.updateCount || 0} amenityCount={selectedPoi.amenities?.length || 0} />
            </div>
          </div>

          {/* Driver Ratings & Reviews */}
          <div data-testid="facility-ratings-section" className="border border-[#D4AF37]/20 rounded-2xl landscape:rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#D4AF37]/8 border-b border-[#D4AF37]/15">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#D4AF37]" fill="currentColor" />
                <span className="text-[10px] landscape:text-[8px] font-black text-[#D4AF37] uppercase tracking-widest">Driver Reviews</span>
              </div>
              {facilityRatings.totalReviews > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-black text-sm">{facilityRatings.averageRating.toFixed(1)}</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= Math.round(facilityRatings.averageRating) ? 'text-[#D4AF37]' : 'text-zinc-700'}`} fill={s <= Math.round(facilityRatings.averageRating) ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  <span className="text-zinc-500 text-[9px] font-bold">({facilityRatings.totalReviews})</span>
                </div>
              )}
            </div>
            <div className="px-4 py-3 landscape:py-2 space-y-3">
              {/* Existing reviews */}
              {facilityRatings.ratings.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {facilityRatings.ratings.slice(0, 5).map((r, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-2.5 h-2.5 ${s <= r.rating ? 'text-[#D4AF37]' : 'text-zinc-700'}`} fill={s <= r.rating ? 'currentColor' : 'none'} />
                            ))}
                          </div>
                          <span className="text-[8px] font-bold text-zinc-400">{r.userName || 'Driver'}</span>
                        </div>
                        <span className="text-[7px] text-zinc-600">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      {r.review && <p className="text-[9px] text-zinc-300 leading-relaxed">{r.review}</p>}
                      {r.tags && r.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.tags.map((tag, ti) => (
                            <span key={ti} className="text-[7px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Rate this facility */}
              {!ratingSubmitted ? (
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 mb-2">Rate this facility:</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-1" data-testid="star-rating-input">
                      {[1,2,3,4,5].map(s => (
                        <button
                          key={s}
                          data-testid={`rate-star-${s}`}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => { setUserRating(s); setShowReviewForm(true); }}
                          className="p-0.5 transition-transform hover:scale-125"
                        >
                          <Star className={`w-5 h-5 transition-colors ${s <= (hoverRating || userRating) ? 'text-[#D4AF37]' : 'text-zinc-700'}`} fill={s <= (hoverRating || userRating) ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                    {userRating > 0 && <span className="text-xs font-bold text-white">{userRating}/5</span>}
                  </div>
                  
                  {showReviewForm && (
                    <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {REVIEW_TAGS.map(tag => (
                          <button
                            key={tag}
                            data-testid={`review-tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                            className={`text-[8px] font-bold px-2 py-1 rounded-full border transition-colors ${
                              selectedTags.includes(tag) 
                                ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]' 
                                : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-white'
                            }`}
                          >
                            <Tag className="w-2 h-2 inline mr-0.5" />{tag}
                          </button>
                        ))}
                      </div>
                      
                      {/* Review text */}
                      <div className="flex gap-2">
                        <input
                          data-testid="review-text-input"
                          type="text"
                          value={reviewText}
                          onChange={e => setReviewText(e.target.value)}
                          placeholder="Write a quick review (optional)"
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50"
                          maxLength={200}
                        />
                        <button
                          data-testid="submit-rating-btn"
                          onClick={submitRating}
                          disabled={!userRating}
                          className="px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-xs font-black uppercase hover:bg-[#B8860B] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Send className="w-3 h-3" /> Rate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl animate-in fade-in duration-300">
                  <Star className="w-4 h-4 text-[#D4AF37]" fill="currentColor" />
                  <span className="text-xs font-bold text-[#D4AF37]">Thanks for your review!</span>
                </div>
              )}
            </div>
          </div>

          {/* Distribution Parking Confidence */}
          {selectedPoi.type === 'distribution' && (
            <div className={`border rounded-2xl landscape:rounded-xl overflow-hidden ${
              isParkingLoading ? 'border-zinc-700' :
              poiParkingStatus?.status === 'light' ? 'border-[#D4AF37]/40' :
              poiParkingStatus?.status === 'medium' ? 'border-yellow-500/40' :
              poiParkingStatus?.status === 'heavy' ? 'border-orange-500/40' :
              poiParkingStatus?.status === 'maxed' ? 'border-red-500/40' : 'border-zinc-700/50'
            }`}>
              <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
                isParkingLoading ? 'bg-zinc-900/60 border-zinc-700/30' :
                poiParkingStatus?.status === 'light' ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20' :
                poiParkingStatus?.status === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20' :
                poiParkingStatus?.status === 'heavy' ? 'bg-orange-500/10 border-orange-500/20' :
                poiParkingStatus?.status === 'maxed' ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-900/60 border-zinc-700/30'
              }`}>
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 flex-shrink-0 ${
                    poiParkingStatus?.status === 'light' ? 'text-[#D4AF37]' :
                    poiParkingStatus?.status === 'medium' ? 'text-yellow-400' :
                    poiParkingStatus?.status === 'heavy' ? 'text-orange-400' :
                    poiParkingStatus?.status === 'maxed' ? 'text-red-400' : 'text-zinc-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17H5a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3m-1 9h-5m5 0v-5m0 5l3-3m-3 3l-3-3" />
                  </svg>
                  <span className="text-[10px] landscape:text-[8px] font-black text-white uppercase tracking-widest">Truck Parking Confidence</span>
                </div>
                {isParkingLoading ? (
                  <div className="w-3 h-3 rounded-full border-2 border-zinc-500 border-t-white animate-spin" />
                ) : (
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    poiParkingStatus?.status === 'light' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' :
                    poiParkingStatus?.status === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    poiParkingStatus?.status === 'heavy' ? 'bg-orange-500/20 text-orange-300' :
                    poiParkingStatus?.status === 'maxed' ? 'bg-red-500/20 text-red-300' : 'bg-zinc-700/50 text-zinc-500'
                  }`}>
                    {poiParkingStatus?.status === 'light' ? 'High' :
                     poiParkingStatus?.status === 'medium' ? 'Moderate' :
                     poiParkingStatus?.status === 'heavy' ? 'Limited' :
                     poiParkingStatus?.status === 'maxed' ? 'Full' : 'Unverified'}
                  </span>
                )}
              </div>
              <div className="px-4 py-3 landscape:py-2 space-y-2.5 landscape:space-y-1.5">
                <div className="flex gap-1">
                  {[1,2,3,4].map(seg => {
                    const filled = !isParkingLoading && (
                      (poiParkingStatus?.status === 'light' && seg <= 4) ||
                      (poiParkingStatus?.status === 'medium' && seg <= 3) ||
                      (poiParkingStatus?.status === 'heavy' && seg <= 2) ||
                      (poiParkingStatus?.status === 'maxed' && seg <= 1)
                    );
                    return (
                      <div key={seg} className={`h-2 landscape:h-1.5 flex-1 rounded-full transition-all duration-500 ${
                        filled
                          ? (poiParkingStatus?.status === 'light' ? 'bg-[#D4AF37]' :
                             poiParkingStatus?.status === 'medium' ? 'bg-yellow-400' :
                             poiParkingStatus?.status === 'heavy' ? 'bg-orange-400' : 'bg-red-400')
                          : 'bg-zinc-800'
                      }`} />
                    );
                  })}
                </div>
                <p className="text-[9px] landscape:text-[8px] font-medium leading-snug">
                  {isParkingLoading ? <span className="text-zinc-500 animate-pulse">Checking driver reports...</span>
                    : poiParkingStatus?.status === 'light' ? <span className="text-[#D4AF37]">Plenty of truck parking available based on recent driver reports</span>
                    : poiParkingStatus?.status === 'medium' ? <span className="text-yellow-400">Moderate parking availability reported by drivers</span>
                    : poiParkingStatus?.status === 'heavy' ? <span className="text-orange-400">Limited space - very few spots remaining</span>
                    : poiParkingStatus?.status === 'maxed' ? <span className="text-red-400">Reported full - no truck parking available right now</span>
                    : <span className="text-zinc-500">No driver reports yet - be the first to report availability below</span>
                  }
                </p>
                {poiParkingStatus?.updateCount ? (
                  <p className="text-[8px] landscape:text-[7px] text-zinc-600 font-medium">
                    Based on {poiParkingStatus.updateCount} driver report{poiParkingStatus.updateCount !== 1 ? 's' : ''} {poiParkingStatus.updatedAt ? `\u00B7 ${new Date(poiParkingStatus.updatedAt).toLocaleString()}` : ''}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* Parking Status Reporting */}
          <div className="border border-[#D4AF37]/20 rounded-2xl landscape:rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#D4AF37]/8 border-b border-[#D4AF37]/15">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span className="text-[10px] landscape:text-[8px] font-black text-[#D4AF37] uppercase tracking-widest">Parking Status</span>
              </div>
              {isParkingLoading && <div className="w-3 h-3 rounded-full border-2 border-[#D4AF37]/40 border-t-[#D4AF37] animate-spin" />}
              {!isParkingLoading && poiParkingStatus?.status && (
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  poiParkingStatus.status === 'light' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' :
                  poiParkingStatus.status === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  poiParkingStatus.status === 'heavy' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {poiParkingStatus.status === 'light' ? 'Light' : poiParkingStatus.status === 'medium' ? 'Medium' : poiParkingStatus.status === 'heavy' ? 'Heavy' : 'Maxed Out'}
                </span>
              )}
              {!isParkingLoading && !poiParkingStatus?.status && <span className="text-[9px] font-bold text-zinc-600 uppercase">No reports yet</span>}
            </div>
            <div className="p-3 landscape:p-2 space-y-2.5 landscape:space-y-1.5">
              {poiParkingStatus?.updatedAt && (
                <p className="text-[9px] landscape:text-[8px] text-zinc-500 font-medium">
                  Last updated: {new Date(poiParkingStatus.updatedAt).toLocaleString()} {'\u00B7'} {poiParkingStatus.updateCount} report{poiParkingStatus.updateCount !== 1 ? 's' : ''}
                </p>
              )}
              <p className="text-[10px] landscape:text-[9px] font-bold text-zinc-400">Report current parking availability:</p>
              <div className="grid grid-cols-4 gap-1.5 landscape:gap-1">
                {([
                  { key: 'light', label: 'Light', bg: 'bg-[#D4AF37]/15 hover:bg-[#D4AF37] border-[#D4AF37]/30 hover:border-[#D4AF37]', text: 'text-[#D4AF37]', dot: 'bg-[#D4AF37]', activeBg: 'bg-[#D4AF37] border-[#D4AF37]' },
                  { key: 'medium', label: 'Medium', bg: 'bg-yellow-600/15 hover:bg-yellow-600 border-yellow-600/30 hover:border-yellow-600', text: 'text-yellow-400', dot: 'bg-yellow-400', activeBg: 'bg-yellow-600 border-yellow-600' },
                  { key: 'heavy', label: 'Heavy', bg: 'bg-orange-600/15 hover:bg-orange-600 border-orange-600/30 hover:border-orange-600', text: 'text-orange-400', dot: 'bg-orange-400', activeBg: 'bg-orange-600 border-orange-600' },
                  { key: 'maxed', label: 'Maxed', bg: 'bg-red-600/15 hover:bg-red-600 border-red-600/30 hover:border-red-600', text: 'text-red-400', dot: 'bg-red-400', activeBg: 'bg-red-600 border-red-600' },
                ] as const).map(opt => {
                  const isActive = parkingSubmitDone === opt.key || poiParkingStatus?.status === opt.key;
                  const isJustSubmitted = parkingSubmitDone === opt.key;
                  return (
                    <button key={opt.key} data-testid={`parking-status-${opt.key}`} onClick={() => submitParkingStatus(opt.key)} disabled={!!parkingSubmitDone}
                      className={`flex flex-col items-center gap-1 py-2 landscape:py-1.5 px-1 rounded-xl landscape:rounded-lg border transition-all ${isJustSubmitted ? `${opt.activeBg} text-white scale-105` : opt.bg} ${isActive && !isJustSubmitted ? `${opt.bg} ring-1 ring-inset ring-current` : ''} disabled:opacity-60`}>
                      <div className={`w-2 h-2 landscape:w-1.5 landscape:h-1.5 rounded-full ${opt.dot} ${isActive ? 'animate-pulse' : ''}`} />
                      <span className={`text-[8px] landscape:text-[7px] font-black uppercase tracking-wide leading-none ${isJustSubmitted ? 'text-white' : opt.text}`}>
                        {isJustSubmitted ? '\u2713' : opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {parkingSubmitDone && <p className="text-[9px] landscape:text-[8px] text-[#D4AF37] font-bold text-center animate-in fade-in duration-300">Thanks for reporting! Status updated.</p>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 md:gap-3 landscape:gap-1.5">
            {/* Add as Next Stop — primary action */}
            <button 
              data-testid="poi-add-next-stop"
              onClick={() => { addWaypoint(selectedPoi, 'DEADHEAD', 0); onClose(); }}
              className="w-full py-3 md:py-4 landscape:py-2 bg-[#D4AF37]/90 hover:bg-[#D4AF37] text-black rounded-2xl landscape:rounded-xl text-xs landscape:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 landscape:gap-2">
              <MapPin className="w-4 h-4 landscape:w-3 landscape:h-3" /> Add as Next Stop
            </button>

            {/* Position selector row */}
            <div className="flex items-center gap-2 md:gap-3 landscape:gap-1.5">
              <select 
                data-testid="poi-stop-position-select"
                value={stopPosition}
                onChange={(e) => setStopPosition(parseInt(e.target.value))}
                className="flex-1 py-2.5 md:py-3 landscape:py-2 px-3 bg-white/5 border border-white/10 rounded-xl landscape:rounded-lg text-xs landscape:text-[10px] font-bold text-white appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                {Array.from({ length: Math.min(10, waypointCount + 1) }, (_, i) => (
                  <option key={i} value={i} className="bg-zinc-900 text-white">Stop #{i + 1}</option>
                ))}
              </select>
              <button 
                data-testid="poi-add-at-position"
                onClick={() => { addWaypoint(selectedPoi, 'DEADHEAD', stopPosition); onClose(); }}
                className="py-2.5 md:py-3 landscape:py-2 px-4 md:px-6 landscape:px-3 bg-white/5 border border-white/10 rounded-xl landscape:rounded-lg text-xs landscape:text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2 landscape:gap-1 whitespace-nowrap">
                <ListOrdered className="w-3.5 h-3.5 landscape:w-3 landscape:h-3" /> Add at #
              </button>
            </div>

            {/* Deadhead / Paid row */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 landscape:gap-1.5">
              <button 
                data-testid="poi-add-deadhead"
                onClick={() => { addWaypoint(selectedPoi, 'DEADHEAD'); onClose(); }}
                className="flex flex-col items-center justify-center gap-1.5 md:gap-2 landscape:gap-1 p-3 md:p-4 landscape:p-2 bg-white/5 border border-white/5 rounded-xl landscape:rounded-lg hover:border-zinc-500 hover:bg-zinc-500/10 transition-all group">
                <GitMerge className="w-4 h-4 md:w-5 md:h-5 landscape:w-3.5 landscape:h-3.5 text-zinc-500 group-hover:scale-110 transition-transform" />
                <span className="text-[8px] md:text-[9px] landscape:text-[7px] font-black text-white uppercase tracking-widest">+ Deadhead</span>
              </button>
              <button 
                data-testid="poi-add-paid"
                onClick={() => { addWaypoint(selectedPoi, 'PAID'); onClose(); }}
                className="flex flex-col items-center justify-center gap-1.5 md:gap-2 landscape:gap-1 p-3 md:p-4 landscape:p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl landscape:rounded-lg hover:bg-[#D4AF37] hover:border-[#D4AF37] transition-all group">
                <CircleDollarSign className="w-4 h-4 md:w-5 md:h-5 landscape:w-3.5 landscape:h-3.5 text-[#D4AF37] group-hover:text-white group-hover:scale-110 transition-transform" />
                <span className="text-[8px] md:text-[9px] landscape:text-[7px] font-black text-[#D4AF37] group-hover:text-white uppercase tracking-widest">+ Paid</span>
              </button>
            </div>
          </div>
          <button onClick={() => { handleNavigate(selectedPoi.name, { lat: selectedPoi.lat, lon: selectedPoi.lon }); onClose(); }}
            className="w-full py-3 md:py-4 landscape:py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-black rounded-2xl landscape:rounded-xl text-xs landscape:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-3 landscape:gap-2">
            <NavIcon className="w-4 h-4 landscape:w-3 landscape:h-3" /> Navigate Directly
          </button>
        </div>
      </div>
    </div>
  );
};
