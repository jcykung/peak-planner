import React, { useState, useEffect, useRef } from 'react';
import { 
  MountainSnow, Download, Upload, Printer, ExternalLink, Menu, Heart, 
  Calendar, Search, Info, Copy, Compass, Image as ImageIcon, CheckCircle, 
  Save, Activity, Timer, ChevronsUp, Car, BookOpen, CalendarRange, 
  Play, MapPin, Sliders, Sun, Snowflake, CloudRain, CloudSnow, Cloud, 
  ParkingCircle, Mountain, Clock, Check, GripVertical, Trash2, 
  MessageSquare, Star, StarHalf 
} from 'lucide-react';
import { HIKE_DATA } from './data/hikes';
import { getElevationCorrectedWeather } from './utils/weather';
import { formatDecimalHour, formatDurationText, calculateTimelineSplits } from './utils/timeline';
import { exportBackupJSON, importBackupJSONFile } from './utils/backup';
import HikeMap from './components/HikeMap';

export default function App() {
  // --- STATE ---
  const [activeHike, setActiveHike] = useState(null);
  const [wishlist, setWishlist] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSort, setActiveSort] = useState("views-desc");
  const [activeDifficultyFilter, setActiveDifficultyFilter] = useState([]);
  
  // Tab states
  const [activeSidebarTab, setActiveSidebarTab] = useState("browse"); // "browse" or "wishlist"
  const [activePlanningTab, setActivePlanningTab] = useState("overview"); // "overview" or "planner"
  const [activeMobileTab, setActiveMobileTab] = useState("list"); // "list", "wish", "plan"
  
  // Trip parameters state
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [planDeparture, setPlanDeparture] = useState(8.0); // 8:00 AM
  const [planLinger, setPlanLinger] = useState(45); // 45 minutes
  const [planPace, setPlanPace] = useState(1.0); // Standard pace (1.0)
  
  // UI helpers
  const [commentText, setCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [toast, setToast] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [printMode, setPrintMode] = useState("single"); // "single" or "wishlist"
  
  const fileInputRef = useRef(null);

  // --- LOCAL STORAGE ---
  useEffect(() => {
    try {
      const stored = localStorage.getItem('peakplanner_wishlist');
      if (stored) {
        setWishlist(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load wishlist from LocalStorage.", e);
    }
  }, []);

  const saveWishlist = (updated) => {
    setWishlist(updated);
    try {
      localStorage.setItem('peakplanner_wishlist', JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save wishlist to LocalStorage.", e);
    }
  };

  // Sync comment field when active hike changes
  useEffect(() => {
    if (activeHike) {
      const item = wishlist[activeHike.id] || {};
      setCommentText(item.comment || "");
    }
  }, [activeHike, wishlist]);

  // Toast feedback helper
  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  };

  // --- HANDLERS ---
  const handleToggleDirectoryCheck = (hikeId) => {
    const item = wishlist[hikeId] || { wished: false, completed: false, comment: "", order: 999 };
    const updated = { ...wishlist };
    
    if (item.wished || item.completed) {
      updated[hikeId] = { ...item, wished: false, completed: false };
    } else {
      updated[hikeId] = { ...item, wished: true, order: Object.keys(wishlist).length };
    }
    
    saveWishlist(updated);
  };

  const handleToggleActiveHikeWish = () => {
    if (!activeHike) return;
    const item = wishlist[activeHike.id] || { wished: false, completed: false, comment: "", order: 999 };
    const updated = { ...wishlist };
    
    const isWishedNow = !item.wished;
    updated[activeHike.id] = {
      ...item,
      wished: isWishedNow,
      completed: isWishedNow ? false : item.completed
    };
    
    saveWishlist(updated);
  };

  const handleToggleActiveHikeComplete = () => {
    if (!activeHike) return;
    const item = wishlist[activeHike.id] || { wished: false, completed: false, comment: "", order: 999 };
    const updated = { ...wishlist };
    
    const isCompletedNow = !item.completed;
    updated[activeHike.id] = {
      ...item,
      completed: isCompletedNow,
      wished: isCompletedNow ? false : item.wished
    };
    
    saveWishlist(updated);
  };

  const handleSaveComment = () => {
    if (!activeHike) return;
    const item = wishlist[activeHike.id] || { wished: false, completed: false, comment: "", order: 999 };
    const updated = { ...wishlist };
    
    updated[activeHike.id] = {
      ...item,
      comment: commentText,
      // Auto add to planned list if they commented but hadn't wished it yet
      wished: (!item.wished && !item.completed) ? true : item.wished
    };
    
    saveWishlist(updated);
    setSavingComment(true);
    setTimeout(() => setSavingComment(false), 1000);
  };

  const handleRemoveFromWishlist = (hikeId) => {
    const item = wishlist[hikeId] || {};
    const updated = {
      ...wishlist,
      [hikeId]: { ...item, wished: false, completed: false }
    };
    saveWishlist(updated);
  };

  // Drag and Drop Swap handlers
  const handleDragStart = (id) => {
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetId) => {
    if (!draggedId || draggedId === targetId) return;

    // Gather wishlisted items sorted by their current priority
    const items = HIKE_DATA.filter(h => {
      const item = wishlist[h.id];
      return item && (item.wished || item.completed);
    });

    items.sort((a, b) => {
      const orderA = wishlist[a.id]?.order ?? 999;
      const orderB = wishlist[b.id]?.order ?? 999;
      return orderA - orderB;
    });

    const sourceIdx = items.findIndex(h => h.id === draggedId);
    const targetIdx = items.findIndex(h => h.id === targetId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    // Reorder array
    const [draggedItem] = items.splice(sourceIdx, 1);
    items.splice(targetIdx, 0, draggedItem);

    // Re-apply priorities
    const updated = { ...wishlist };
    items.forEach((item, idx) => {
      updated[item.id] = {
        ...(updated[item.id] || {}),
        order: idx
      };
    });

    saveWishlist(updated);
  };

  // Difficulty filter multi-select
  const handleToggleDifficultyFilter = (level) => {
    setActiveDifficultyFilter(prev => {
      if (prev.includes(level)) {
        return prev.filter(x => x !== level);
      } else {
        return [...prev, level];
      }
    });
  };

  // Backup & Restore handlers
  const handleExportJSON = () => {
    exportBackupJSON(wishlist);
    showToast("Backup downloaded!");
  };

  const handleTriggerImport = () => {
    fileInputRef.current.click();
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const parsed = await importBackupJSONFile(file);
      saveWishlist(parsed);
      showToast("Backup restored successfully!");
    } catch (err) {
      showToast(err.message, true);
    }
    e.target.value = ""; // Reset
  };

  // Clipboard Copiers
  const handleCopySingleItinerary = () => {
    if (!activeHike) return;

    const splits = calculateTimelineSplits({
      duration: activeHike.duration,
      planPace,
      departHour: planDeparture,
      lingerMinutes: planLinger,
      dateStr: planDate
    });

    const textBlock = `🌲 TRIP PLAN: ${activeHike.name.toUpperCase()} 🌲
📅 Target Date: ${planDate}
🚗 Distance from Vancouver: ${activeHike.distFromVan} mins drive
🏔 Route Specs: ${activeHike.distance} round-trip (~${activeHike.duration} hours)
📍 Suggested Meeting Point: ${activeHike.meetingPoint}
⏱ EXPEDITION SCHEDULE:
- Trailhead Start: ${formatDecimalHour(splits.timeDepart)}
- Reach Summit Peak: ${formatDecimalHour(splits.timeSummit)}
- Start Descending: ${formatDecimalHour(splits.timeDescent)}
- Return to Vehicles: ${formatDecimalHour(splits.timeReturn)}
* Parking Area: ${activeHike.parking}

Prepare well, pack the 10 essentials, warm insulation, and sturdy footwear!`;

    navigator.clipboard.writeText(textBlock)
      .then(() => showToast("Copied single plan!"))
      .catch(() => showToast("Failed to copy to clipboard", true));
  };

  const handleCopyWishlist = () => {
    const listItems = getSortedWishlistItems();
    if (listItems.length === 0) {
      showToast("Wishlist is empty!", true);
      return;
    }

    let text = `🎒 MY PEAKPLANNER WISHLIST & ADVENTURE LOGS 🎒\n`;
    text += `Total Hikes: ${listItems.length}\n`;
    text += `-----------------------------------------------\n\n`;

    listItems.forEach((hike, index) => {
      const item = wishlist[hike.id] || {};
      const notes = item.comment ? `\n   ↳ Notes: "${item.comment}"` : "";

      if (item.completed) {
        text += `${index + 1}. [x] ~~${hike.name} (${hike.region})~~\n`;
        text += `   ~~Specs: ${hike.distance} | ${hike.elevation}m gain | ${hike.duration} hours | ${hike.distFromVan}m drive~~${notes}\n\n`;
      } else {
        text += `${index + 1}. [ ] ${hike.name} (${hike.region})\n`;
        text += `   Specs: ${hike.distance} | ${hike.elevation}m gain | ${hike.duration} hours | ${hike.distFromVan}m drive${notes}\n\n`;
      }
    });

    text += `Join my next climb! Check trailhead guides on VancouverTrails.com.`;

    navigator.clipboard.writeText(text)
      .then(() => showToast("Copied wishlist catalog!"))
      .catch(() => showToast("Failed to copy", true));
  };

  // Print controls
  const triggerPrintSingle = () => {
    setPrintMode("single");
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const triggerPrintWishlist = () => {
    setPrintMode("wishlist");
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // --- QUERY & CALCULATION LOGIC ---
  const getSortedHikes = () => {
    let filtered = HIKE_DATA.filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            h.region.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDiff = activeDifficultyFilter.length === 0 || activeDifficultyFilter.includes(h.difficulty);
      return matchesSearch && matchesDiff;
    });

    filtered.sort((a, b) => {
      if (activeSort === "views-desc") return b.views - a.views;
      if (activeSort === "duration-asc") return a.duration - b.duration;
      if (activeSort === "duration-desc") return b.duration - a.duration;
      if (activeSort === "distance-asc") return a.distFromVan - b.distFromVan;
      if (activeSort === "difficulty-asc") return a.difficultyLevel - b.difficultyLevel;
      if (activeSort === "difficulty-desc") return b.difficultyLevel - a.difficultyLevel;
      return 0;
    });

    return filtered;
  };

  const getSortedWishlistItems = () => {
    let listItems = HIKE_DATA.filter(h => {
      const item = wishlist[h.id];
      return item && (item.wished || item.completed);
    });

    if (activeSort === 'manual-order') {
      listItems.sort((a, b) => {
        const orderA = wishlist[a.id]?.order ?? 999;
        const orderB = wishlist[b.id]?.order ?? 999;
        return orderA - orderB;
      });
    } else {
      listItems.sort((a, b) => {
        if (activeSort === "views-desc") return b.views - a.views;
        if (activeSort === "duration-asc") return a.duration - b.duration;
        if (activeSort === "duration-desc") return b.duration - a.duration;
        if (activeSort === "distance-asc") return a.distFromVan - b.distFromVan;
        if (activeSort === "difficulty-asc") return a.difficultyLevel - b.difficultyLevel;
        if (activeSort === "difficulty-desc") return b.difficultyLevel - a.difficultyLevel;
        return 0;
      });
    }

    return listItems;
  };

  // Stats
  const plannedCount = Object.values(wishlist).filter(x => x.wished).length;
  const completedCount = Object.values(wishlist).filter(x => x.completed).length;

  const activeWeather = activeHike ? getElevationCorrectedWeather(activeHike, planDate) : null;
  const activeTimeline = activeHike ? calculateTimelineSplits({
    duration: activeHike.duration,
    planPace,
    departHour: planDeparture,
    lingerMinutes: planLinger,
    dateStr: planDate
  }) : null;

  // Custom stars for hike details rendering
  const renderRatingStars = (rating) => {
    const stars = [];
    const filled = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;
    for (let i = 0; i < filled; i++) {
      stars.push(<Star key={`filled-${i}`} className="w-4 h-4 fill-monokai-yellow stroke-none" />);
    }
    if (hasHalf) {
      stars.push(<StarHalf key="half" className="w-4 h-4 fill-monokai-yellow text-monokai-yellow" />);
    }
    return stars;
  };

  // Date formats for print view
  const formattedPrintDate = () => {
    const date = new Date(planDate + "T00:00:00");
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const todayPrintDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top Sleek Header */}
      <header className="bg-monokai-deep border-b border-monokai-hover px-4 md:px-6 py-3.5 flex items-center justify-between z-10 no-print">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-monokai-pink to-monokai-yellow rounded-xl flex items-center justify-center shadow-lg">
            <MountainSnow className="w-6 h-6 text-monokai-deep stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-monokai-text flex items-center gap-2">
              PEAKPLANNER
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Backup & Restore local controller */}
          <div className="flex items-center bg-monokai-card border border-monokai-hover rounded-lg p-0.5 space-x-1">
            <button 
              onClick={handleExportJSON}
              className="flex items-center space-x-1 bg-monokai-hover hover:bg-monokai-active text-monokai-text px-2.5 py-1.5 rounded text-xs transition font-medium"
              title="Export Wishlist to JSON backup"
            >
              <Download className="w-3.5 h-3.5 text-monokai-blue" />
              <span className="hidden md:inline">Backup</span>
            </button>
            <button 
              onClick={handleTriggerImport}
              className="flex items-center space-x-1 bg-monokai-hover hover:bg-monokai-active text-monokai-text px-2.5 py-1.5 rounded text-xs transition font-medium"
              title="Import JSON backup file"
            >
              <Upload className="w-3.5 h-3.5 text-monokai-green" />
              <span className="hidden md:inline">Restore</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".json"
              onChange={handleImportJSON}
            />
          </div>

          <button 
            onClick={triggerPrintSingle}
            className="flex items-center space-x-2 bg-monokai-hover hover:bg-monokai-active text-monokai-text px-3 py-2 rounded-lg border border-monokai-dim/10 text-xs transition font-medium"
          >
            <Printer className="w-4 h-4 text-monokai-yellow" />
            <span className="hidden sm:inline">Print Active Itinerary</span>
          </button>
          
          <a 
            href="https://www.vancouvertrails.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-monokai-dim hover:text-monokai-blue transition flex items-center gap-1 bg-monokai-deep px-3 py-2 rounded-lg border border-monokai-hover"
          >
            <span className="hidden lg:inline">Primary Resource: VancouverTrails.com</span>
            <span className="lg:hidden">vancouvertrails.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Content Panel Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden no-print relative">
        
        {/* Mobile View Mode Toggle Bar (Visible on mobile/tablet screens only) */}
        <div className="lg:hidden flex bg-monokai-deep border-b border-monokai-hover p-1 z-10 no-print">
          <button 
            onClick={() => {
              setActiveMobileTab("list");
              setActiveSidebarTab("browse");
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center space-x-2 ${
              activeMobileTab === "list" && activeSidebarTab === "browse"
                ? "text-monokai-yellow bg-monokai-active" 
                : "text-monokai-dim hover:text-monokai-text"
            }`}
          >
            <Menu className="w-4 h-4" />
            <span>Hike Directory</span>
          </button>
          
          <button 
            onClick={() => {
              setActiveMobileTab("wish");
              setActiveSidebarTab("wishlist");
              // Switch sort to manual visual ordering to aid priorities
              setActiveSort("manual-order");
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center space-x-2 ${
              activeMobileTab === "wish"
                ? "text-monokai-yellow bg-monokai-active" 
                : "text-monokai-dim hover:text-monokai-text"
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Wishlist</span>
          </button>
          
          <button 
            onClick={() => setActiveMobileTab("plan")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center space-x-2 ${
              activeMobileTab === "plan" 
                ? "text-monokai-yellow bg-monokai-active" 
                : "text-monokai-dim hover:text-monokai-text"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Planner</span>
          </button>
        </div>

        {/* Left Sidebar: Filter, Search & Hike Directory / Wishlist Tabbed View */}
        <section 
          id="sidebar-panel"
          className={`w-full lg:w-[440px] bg-monokai-deep border-r border-monokai-hover flex flex-col overflow-hidden transition-all duration-300 ${
            activeMobileTab === "plan" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Sidebar Navigation Tabs (Browse Hikes vs My Wishlist) */}
          <div className="grid grid-cols-2 border-b border-monokai-hover bg-monokai-card">
            <button 
              onClick={() => {
                setActiveSidebarTab("browse");
                if (activeSort === "manual-order") setActiveSort("views-desc");
              }}
              className={`py-3 text-sm font-bold transition flex items-center justify-center gap-2 border-b-2 ${
                activeSidebarTab === "browse" 
                  ? "text-monokai-yellow border-monokai-yellow" 
                  : "text-monokai-dim border-transparent hover:text-monokai-text"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Browse Trails</span>
            </button>
            <button 
              onClick={() => {
                setActiveSidebarTab("wishlist");
                setActiveSort("manual-order");
              }}
              className={`py-3 text-sm font-bold transition flex items-center justify-center gap-2 border-b-2 ${
                activeSidebarTab === "wishlist" 
                  ? "text-monokai-yellow border-monokai-yellow" 
                  : "text-monokai-dim border-transparent hover:text-monokai-text"
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Wishlist</span>
              {(plannedCount + completedCount) > 0 && (
                <span className="px-1.5 py-0.5 bg-monokai-pink text-monokai-deep text-[10px] font-bold rounded-full">
                  {plannedCount + completedCount}
                </span>
              )}
            </button>
          </div>

          {/* Search & Filtering UI Controls */}
          <div className="p-4 border-b border-monokai-hover space-y-4 bg-monokai-card/30">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="w-5 h-5 text-monokai-dim" />
              </span>
              <input 
                type="text" 
                placeholder="Search 25+ trails within 2 hours..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-monokai-bg text-monokai-text pl-10 pr-4 py-2.5 rounded-lg border border-monokai-hover focus:outline-none focus:ring-2 focus:ring-monokai-yellow text-sm transition"
              />
            </div>

            {/* Sort & Filter Selector Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-monokai-dim uppercase tracking-wider mb-1">
                  Sort Trails By
                </label>
                <select 
                  value={activeSort}
                  onChange={(e) => setActiveSort(e.target.value)}
                  className="w-full bg-monokai-bg text-monokai-text text-xs rounded-lg px-2 py-2 border border-monokai-hover focus:outline-none focus:ring-1 focus:ring-monokai-yellow"
                >
                  <option value="views-desc">★ View Rating (High-Low)</option>
                  <option value="duration-asc">⏱ Duration (Shortest first)</option>
                  <option value="duration-desc">⏱ Duration (Longest first)</option>
                  <option value="distance-asc">🚗 Distance from Van (Closest)</option>
                  <option value="difficulty-asc">🏔 Difficulty (Easy-Hard)</option>
                  <option value="difficulty-desc">🏔 Difficulty (Hard-Easy)</option>
                  {activeSidebarTab === 'wishlist' && (
                    <option value="manual-order">🔄 Drag Priority Order</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-monokai-dim uppercase tracking-wider mb-1">
                  Filter Level
                </label>
                <div className="flex space-x-1" id="difficulty-filters">
                  {["Easy", "Intermediate", "Difficult"].map(level => {
                    const isFiltered = activeDifficultyFilter.includes(level);
                    return (
                      <button 
                        key={level}
                        onClick={() => handleToggleDifficultyFilter(level)}
                        className={`flex-1 py-1.5 rounded text-[11px] font-semibold border transition ${
                          isFiltered 
                            ? "border-monokai-yellow text-monokai-yellow bg-monokai-active" 
                            : "border-monokai-hover bg-monokai-bg hover:bg-monokai-hover text-monokai-dim"
                        }`}
                      >
                        {level === "Intermediate" ? "Inter" : level === "Difficult" ? "Diff" : level}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Wishlist Summary Actions Card */}
            {activeSidebarTab === "wishlist" && (
              <div className="pt-1 space-y-2 border-t border-monokai-hover/30">
                <div className="flex items-center justify-between text-xs text-monokai-dim font-mono">
                  <span className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-monokai-yellow" />
                    <span className="text-[10px]">Drag cards vertically to prioritize</span>
                  </span>
                  <span>{plannedCount} planned | {completedCount} done</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleCopyWishlist}
                    className="py-1.5 px-2 bg-monokai-hover hover:bg-monokai-active text-monokai-text rounded-lg border border-monokai-hover text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-monokai-blue" />
                    <span>Copy List Invite</span>
                  </button>
                  <button 
                    onClick={triggerPrintWishlist}
                    className="py-1.5 px-2 bg-monokai-hover hover:bg-monokai-active text-monokai-text rounded-lg border border-monokai-hover text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-monokai-yellow" />
                    <span>Print Wishlist</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Hike Card List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeSidebarTab === "browse" ? (
              // BROWSE TRAILS LIST
              (() => {
                const hikes = getSortedHikes();
                if (hikes.length === 0) {
                  return <p className="text-center text-xs text-monokai-dim py-8">No matching trails found.</p>;
                }
                return hikes.map(hike => {
                  const item = wishlist[hike.id] || {};
                  const isChecked = !!(item.wished || item.completed);
                  const isSelected = activeHike && activeHike.id === hike.id;

                  let diffColor = "bg-monokai-green text-monokai-deep";
                  if (hike.difficulty === "Intermediate") diffColor = "bg-monokai-orange text-monokai-deep";
                  if (hike.difficulty === "Difficult") diffColor = "bg-monokai-pink text-monokai-deep";

                  return (
                    <div 
                      key={hike.id}
                      className={`p-3 rounded-xl border transition flex items-center space-x-3 group relative ${
                        isSelected 
                          ? 'bg-monokai-active border-monokai-yellow text-monokai-text' 
                          : 'bg-monokai-card border-monokai-hover hover:bg-monokai-hover text-monokai-dim hover:text-monokai-text'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center shrink-0 pr-1 no-print">
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleToggleDirectoryCheck(hike.id)}
                          className="w-5 h-5 rounded border-monokai-hover text-monokai-yellow bg-monokai-bg focus:ring-monokai-yellow focus:ring-offset-monokai-bg focus:ring-2 cursor-pointer transition"
                          title="Toggle Wishlist status"
                        />
                      </div>

                      {/* Clickable Card Body */}
                      <div 
                        className="flex-1 min-w-0 flex space-x-3 cursor-pointer"
                        onClick={() => {
                          setActiveHike(hike);
                          setActivePlanningTab("overview");
                          // Auto shift on mobile to planner tab
                          if (window.innerWidth < 1024) {
                            setActiveMobileTab("plan");
                          }
                        }}
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-monokai-bg relative">
                          <img 
                            src={hike.img} 
                            alt={hike.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=150&q=80';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-bold text-xs tracking-tight truncate text-monokai-text">{hike.name}</h4>
                            <span className="text-[10px] font-mono font-bold text-monokai-yellow flex items-center gap-0.5 shrink-0 pl-1">
                              <Star className="w-3.5 h-3.5 fill-monokai-yellow stroke-none" />
                              <span>{hike.views.toFixed(1)}</span>
                            </span>
                          </div>
                          <p className="text-[10px] text-monokai-dim truncate uppercase font-mono">{hike.region}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${diffColor} font-bold`}>{hike.difficulty}</span>
                            <span className="text-[9px] font-mono text-monokai-orange flex items-center gap-0.5">
                              <Car className="w-2.5 h-2.5" />
                              <span>{hike.distFromVan}m</span>
                            </span>
                            <span className="text-[9px] font-mono text-monokai-purple flex items-center gap-0.5">
                              <Timer className="w-2.5 h-2.5" />
                              <span>{hike.duration}h</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              // WISHLIST CARDS LIST
              (() => {
                const listItems = getSortedWishlistItems();
                if (listItems.length === 0) {
                  return (
                    <div className="text-center p-6 text-xs text-monokai-dim bg-monokai-card/40 rounded-xl border border-dashed border-monokai-hover">
                      <Heart className="w-8 h-8 mx-auto mb-2 text-monokai-hover" />
                      <p className="font-semibold text-monokai-text mb-1">Your Wishlist is Empty</p>
                      <p>Browse trails on the first tab and check them off to build your personal bucket list!</p>
                    </div>
                  );
                }

                return listItems.map((hike, index) => {
                  const item = wishlist[hike.id] || {};
                  const isCompleted = !!item.completed;
                  const comment = item.comment || "";
                  const isSelected = activeHike && activeHike.id === hike.id;

                  return (
                    <div 
                      key={hike.id}
                      draggable
                      onDragStart={() => handleDragStart(hike.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(hike.id)}
                      className={`p-3 rounded-xl border transition flex flex-col space-y-2 relative bg-monokai-card border-monokai-hover text-monokai-dim hover:text-monokai-text ${
                        isSelected ? 'border-monokai-yellow bg-monokai-active' : ''
                      } ${draggedId === hike.id ? 'dragging' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Left Completed checkbox */}
                        <div className="flex items-center shrink-0 pr-1" title="Mark this hike as Completed">
                          <input 
                            type="checkbox" 
                            checked={isCompleted} 
                            onChange={() => {
                              const updated = {
                                ...wishlist,
                                [hike.id]: {
                                  ...item,
                                  completed: !isCompleted,
                                  wished: isCompleted // Set back to wished when uncompleted
                                }
                              };
                              saveWishlist(updated);
                            }}
                            className="w-5 h-5 rounded border-monokai-hover text-monokai-green bg-monokai-bg focus:ring-monokai-green focus:ring-offset-monokai-bg focus:ring-2 cursor-pointer transition"
                          />
                        </div>

                        {/* Card body details trigger */}
                        <div 
                          className="flex-1 min-w-0 flex space-x-3 items-start cursor-pointer"
                          onClick={() => {
                            setActiveHike(hike);
                            setActivePlanningTab("overview");
                            if (window.innerWidth < 1024) {
                              setActiveMobileTab("plan");
                            }
                          }}
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-monokai-bg relative">
                            <img 
                              src={hike.img} 
                              alt={hike.name} 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=150&q=80';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-1">
                              <h4 className={`font-bold text-xs tracking-tight truncate text-monokai-text ${
                                isCompleted ? 'line-through opacity-60' : ''
                              }`}>
                                {hike.name}
                              </h4>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                isCompleted ? 'bg-monokai-green text-monokai-deep' : 'bg-monokai-yellow text-monokai-deep'
                              }`}>
                                {isCompleted ? 'Completed' : 'Planned'}
                              </span>
                            </div>
                            <p className="text-[9px] text-monokai-dim truncate uppercase font-mono">{hike.region}</p>
                          </div>
                        </div>

                        {/* Drag Handle grip icon */}
                        <div class="shrink-0 text-monokai-dim/40 cursor-grab active:cursor-grabbing p-1">
                          <GripVertical className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Comment Box */}
                      {comment && (
                        <div className="bg-monokai-bg/60 p-2 rounded-lg text-[10px] text-monokai-text italic border border-monokai-hover flex items-start gap-1">
                          <MessageSquare className="w-3 h-3 text-monokai-yellow shrink-0 mt-0.5" />
                          <span className="truncate flex-1">{comment}</span>
                        </div>
                      )}

                      {/* Priority details & deletion */}
                      <div className="flex items-center justify-between border-t border-monokai-hover/30 pt-2 text-[10px] font-mono">
                        <button 
                          onClick={() => handleRemoveFromWishlist(hike.id)}
                          className="text-monokai-pink hover:underline flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                        
                        <div className="text-[9px] text-monokai-dim flex items-center gap-1">
                          <span>Priority Rank:</span>
                          <span className="font-bold text-monokai-yellow">{index + 1}</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </section>

        {/* Right Main: Active Hike Presentation, Maps & Planning Engine */}
        <section 
          id="planning-viewport"
          className={`flex-1 flex flex-col overflow-y-auto bg-monokai-bg ${
            activeMobileTab === "plan" ? "flex" : "hidden lg:flex"
          }`}
        >
          {activeHike === null ? (
            // --- EMPTY VIEW STATE ---
            <div id="empty-view" className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center">
              <div className="relative mb-6">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-monokai-pink via-monokai-yellow to-monokai-blue blur opacity-20 animate-pulse"></div>
                <div className="relative bg-monokai-card p-6 rounded-full border border-monokai-hover">
                  <Compass className="w-16 h-16 text-monokai-yellow animate-spin" style={{ animationDuration: '12s' }} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-monokai-text mb-2">Explore Vancouver's Majestic Peaks</h3>
              <p className="text-monokai-dim max-w-md mx-auto text-sm leading-relaxed mb-6">
                Select any of the 25+ premiere Vancouver area trails under 2 hours away from the directory. Check
                off trails you want to do, drag to organize your priorities, schedule safe group timelines, and
                print out plans.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg text-left text-xs font-mono text-monokai-dim">
                <div className="bg-monokai-card p-3 rounded border border-monokai-hover flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-monokai-green"></span>
                  <span>Drag-to-Order</span>
                </div>
                <div className="bg-monokai-card p-3 rounded border border-monokai-hover flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-monokai-yellow"></span>
                  <span>Altitude Weather</span>
                </div>
                <div className="bg-monokai-card p-3 rounded border border-monokai-hover flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-monokai-blue"></span>
                  <span>Live Location Map</span>
                </div>
                <div className="bg-monokai-card p-3 rounded border border-monokai-hover flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-monokai-pink"></span>
                  <span>Sunset Alerts</span>
                </div>
              </div>
            </div>
          ) : (
            // --- ACTIVE DETAIL PANE STATE ---
            <div id="active-hike-panel">
              
              {/* Hero Cover with Image and Quick Stats Overlay */}
              <div className="relative h-[220px] md:h-[300px] w-full overflow-hidden">
                <img 
                  id="hero-img" 
                  src={activeHike.img} 
                  alt="Hike Banner"
                  className="w-full h-full object-cover brightness-[0.35] transition-all duration-700 scale-100"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1200&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-monokai-bg via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <span id="hero-region" className="text-xs font-mono tracking-widest text-monokai-yellow uppercase bg-monokai-deep/80 px-2.5 py-1 rounded border border-monokai-yellow/30">
                      {activeHike.region}
                    </span>
                    <h2 id="hero-title" className="text-2xl md:text-4xl font-extrabold text-monokai-text mt-2 tracking-tight">
                      {activeHike.name}
                    </h2>
                    <div className="text-sm text-monokai-dim flex items-center gap-2 mt-1">
                      <span id="hero-stars" className="text-monokai-yellow flex items-center gap-1">
                        {renderRatingStars(activeHike.views)}
                      </span>
                      <span id="hero-rating-val">{activeHike.views.toFixed(1)} View Rating</span>
                      <span className="text-monokai-hover">|</span>
                      <span id="hero-best-season">Best Season: {activeHike.season}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(activeHike.name + ' summit vancouver trails viewpoints')}`;
                        window.open(searchUrl, '_blank');
                      }}
                      className="flex items-center space-x-2 bg-monokai-deep/80 backdrop-blur hover:bg-monokai-hover text-monokai-text border border-monokai-dim/20 px-3.5 py-2 rounded-lg text-xs transition font-semibold"
                    >
                      <ImageIcon className="w-4 h-4 text-monokai-pink" />
                      <span>Summit Photos</span>
                    </button>
                    <button 
                      onClick={handleCopySingleItinerary}
                      className="flex items-center space-x-2 bg-monokai-deep/80 backdrop-blur hover:bg-monokai-hover text-monokai-text border border-monokai-dim/20 px-3.5 py-2 rounded-lg text-xs transition font-semibold"
                    >
                      <Copy className="w-4 h-4 text-monokai-blue" />
                      <span>Copy Trip Itinerary</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Personal Wishlist & Progress Card inside Detail View */}
              <div className="px-6 py-4 bg-monokai-card/40 border-b border-monokai-hover flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Add to Wishlist Toggle Button */}
                  <button 
                    onClick={handleToggleActiveHikeWish}
                    className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl border font-bold text-sm transition flex items-center justify-center space-x-2 ${
                      wishlist[activeHike.id]?.wished 
                        ? "border-monokai-yellow bg-monokai-active text-monokai-yellow" 
                        : "border-monokai-hover bg-monokai-card hover:bg-monokai-hover text-monokai-dim hover:text-monokai-text"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${wishlist[activeHike.id]?.wished ? 'fill-monokai-yellow text-monokai-yellow' : ''}`} />
                    <span>{wishlist[activeHike.id]?.wished ? 'Wishlisted' : 'Add to Wishlist'}</span>
                  </button>

                  {/* Completed Badging Toggle */}
                  <button 
                    onClick={handleToggleActiveHikeComplete}
                    className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl border font-bold text-sm transition flex items-center justify-center space-x-2 ${
                      wishlist[activeHike.id]?.completed 
                        ? "border-monokai-green bg-monokai-active text-monokai-green" 
                        : "border-monokai-hover bg-monokai-card hover:bg-monokai-hover text-monokai-dim hover:text-monokai-text"
                    }`}
                  >
                    <CheckCircle className={`w-4 h-4 ${wishlist[activeHike.id]?.completed ? 'fill-monokai-green text-monokai-green' : ''}`} />
                    <span>{wishlist[activeHike.id]?.completed ? 'Hike Completed' : 'Mark as Completed'}</span>
                  </button>
                </div>

                {/* Personal Comment Field */}
                <div className="flex-[1.5] relative">
                  <textarea 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows="1"
                    placeholder="Write personal notes, trail details or best memory..."
                    className="w-full bg-monokai-bg text-monokai-text rounded-xl border border-monokai-hover px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-monokai-yellow pr-12 transition resize-none"
                  />
                  <button 
                    onClick={handleSaveComment}
                    className={`absolute right-2 top-2 p-1.5 rounded-lg bg-monokai-hover hover:bg-monokai-active border transition ${
                      savingComment ? 'border-monokai-green text-monokai-green' : 'border-monokai-hover text-monokai-yellow'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Core Stats Grid */}
              <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-monokai-hover">
                <div className="bg-monokai-card p-3 md:p-4 rounded-xl border border-monokai-hover flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-monokai-pink/10 text-monokai-pink">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-monokai-dim font-mono uppercase">Distance</span>
                    <span className="text-sm md:text-base font-bold text-monokai-text">{activeHike.distance}</span>
                  </div>
                </div>
                
                <div className="bg-monokai-card p-3 md:p-4 rounded-xl border border-monokai-hover flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-monokai-orange/10 text-monokai-orange">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-monokai-dim font-mono uppercase">Est. Duration</span>
                    <span className="text-sm md:text-base font-bold text-monokai-text">{activeHike.duration} Hours</span>
                  </div>
                </div>
                
                <div className="bg-monokai-card p-3 md:p-4 rounded-xl border border-monokai-hover flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-monokai-blue/10 text-monokai-blue">
                    <ChevronsUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-monokai-dim font-mono uppercase">Elevation Gain</span>
                    <span className="text-sm md:text-base font-bold text-monokai-text">{activeHike.elevation} m</span>
                  </div>
                </div>
                
                <div className="bg-monokai-card p-3 md:p-4 rounded-xl border border-monokai-hover flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-monokai-purple/10 text-monokai-purple">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-monokai-dim font-mono uppercase">Van Driving</span>
                    <span className="text-sm md:text-base font-bold text-monokai-text">{activeHike.distFromVan} Mins</span>
                  </div>
                </div>
              </div>

              {/* Tabbed Layout Header */}
              <div className="border-b border-monokai-hover px-6 flex space-x-6 text-sm font-semibold">
                <button 
                  onClick={() => setActivePlanningTab("overview")}
                  className={`py-4 flex items-center gap-2 border-b-2 transition focus:outline-none ${
                    activePlanningTab === "overview" 
                      ? "text-monokai-yellow border-monokai-yellow" 
                      : "text-monokai-dim hover:text-monokai-text border-transparent"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Route & Navigation</span>
                </button>
                <button 
                  onClick={() => setActivePlanningTab("planner")}
                  className={`py-4 flex items-center gap-2 border-b-2 transition focus:outline-none ${
                    activePlanningTab === "planner" 
                      ? "text-monokai-yellow border-monokai-yellow" 
                      : "text-monokai-dim hover:text-monokai-text border-transparent"
                  }`}
                >
                  <CalendarRange className="w-4 h-4 text-monokai-purple" />
                  <span>Planner & Weather Module</span>
                </button>
              </div>

              {/* Tab Content: Route & Navigation */}
              {activePlanningTab === "overview" && (
                <div className="p-4 md:p-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Description walkthrough */}
                    <div className="lg:col-span-7 space-y-6">
                      <div>
                        <h4 className="text-xs font-mono text-monokai-yellow uppercase mb-2">Trail Route Walkthrough</h4>
                        <p className="text-monokai-text/95 leading-relaxed text-sm bg-monokai-card p-4 rounded-xl border border-monokai-hover">
                          {activeHike.instructions}
                        </p>
                      </div>

                      <div className="bg-monokai-card p-4 rounded-xl border border-monokai-hover space-y-3">
                        <div className="flex items-center space-x-2 text-monokai-orange">
                          <Info className="w-4 h-4" />
                          <span className="text-xs font-mono uppercase">Parking & Gathering Details</span>
                        </div>
                        <div className="space-y-2 text-sm leading-relaxed">
                          <p>
                            <strong className="text-monokai-text">Where to Park:</strong>{" "}
                            <span className="text-monokai-dim">{activeHike.parking}</span>
                          </p>
                          <p>
                            <strong className="text-monokai-text">Suggested Meeting Point:</strong>{" "}
                            <span className="text-monokai-dim">{activeHike.meetingPoint}</span>
                          </p>
                        </div>
                      </div>

                      {/* YouTube Frame */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-mono text-monokai-yellow uppercase flex items-center gap-2">
                          <Play className="w-4 h-4 text-monokai-pink" />
                          <span>VancouverTrails Video Overview</span>
                        </h4>
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-monokai-hover bg-monokai-deep">
                          <iframe 
                            className="absolute inset-0 w-full h-full" 
                            src={`https://www.youtube.com/embed/${activeHike.youtube}?rel=0`}
                            title="VancouverTrails Hike Overview" 
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            allowFullScreen
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Map coordinates */}
                    <div className="lg:col-span-5 flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-monokai-dim uppercase">Trailhead Map Coordinates</span>
                        <span className="text-[11px] font-mono text-monokai-blue bg-monokai-deep px-2.5 py-1 rounded border border-monokai-hover flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-monokai-blue" />
                          {activeHike.coords[0].toFixed(4)}, {activeHike.coords[1].toFixed(4)}
                        </span>
                      </div>
                      
                      <div className="h-[280px] md:h-[350px]">
                        <HikeMap 
                          lat={activeHike.coords[0]} 
                          lng={activeHike.coords[1]} 
                          label={activeHike.name} 
                        />
                      </div>
                      <span className="text-[10px] font-mono text-monokai-dim text-right leading-none block">
                        Interact with the map to assess surrounding road accesses
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Planner & Weather Module */}
              {activePlanningTab === "planner" && (
                <div className="p-4 md:p-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Interactive controls */}
                    <div className="lg:col-span-5 bg-monokai-card p-4 md:p-5 rounded-2xl border border-monokai-hover space-y-5">
                      <h4 className="text-xs font-mono text-monokai-yellow uppercase tracking-wider border-b border-monokai-hover pb-2 flex items-center justify-between">
                        <span>Adjust Trip Parameters</span>
                        <Sliders className="w-4 h-4 text-monokai-dim" />
                      </h4>

                      {/* Date Selector */}
                      <div>
                        <label className="block text-[11px] font-mono text-monokai-dim uppercase mb-1.5 flex items-center justify-between">
                          <span>Target Adventure Date</span>
                          <span className="text-monokai-blue text-[10px]">(Altitude Weather Engine)</span>
                        </label>
                        <input 
                          type="date" 
                          value={planDate}
                          onChange={(e) => setPlanDate(e.target.value)}
                          className="w-full bg-monokai-bg text-monokai-text rounded-lg border border-monokai-hover px-3 py-2 text-sm focus:outline-none focus:border-monokai-yellow"
                        />
                      </div>

                      {/* Departure Hour Slider */}
                      <div>
                        <div className="flex justify-between text-[11px] font-mono text-monokai-dim mb-1">
                          <span>TRAILHEAD DEPARTURE</span>
                          <span className="text-monokai-yellow font-bold">{formatDecimalHour(planDeparture)}</span>
                        </div>
                        <input 
                          type="range" 
                          min="5" 
                          max="20" 
                          step="0.5" 
                          value={planDeparture}
                          onChange={(e) => setPlanDeparture(parseFloat(e.target.value))}
                          className="w-full h-1 bg-monokai-hover rounded-lg appearance-none cursor-pointer accent-monokai-yellow"
                        />
                        <div className="flex justify-between text-[9px] text-monokai-dim mt-1 font-mono">
                          <span>5:00 AM</span>
                          <span>12:00 PM</span>
                          <span>8:00 PM</span>
                        </div>
                      </div>

                      {/* Linger slider */}
                      <div>
                        <div className="flex justify-between text-[11px] font-mono text-monokai-dim mb-1">
                          <span>SUMMIT LINGER DURATION</span>
                          <span className="text-monokai-purple font-bold">{planLinger} Minutes</span>
                        </div>
                        <input 
                          type="range" 
                          min="15" 
                          max="180" 
                          step="15" 
                          value={planLinger}
                          onChange={(e) => setPlanLinger(parseInt(e.target.value))}
                          className="w-full h-1 bg-monokai-hover rounded-lg appearance-none cursor-pointer accent-monokai-purple"
                        />
                        <div className="flex justify-between text-[9px] text-monokai-dim mt-1 font-mono">
                          <span>15 mins</span>
                          <span>1.5 Hours</span>
                          <span>3 Hours</span>
                        </div>
                      </div>

                      {/* Pace Selector */}
                      <div>
                        <label className="block text-[11px] font-mono text-monokai-dim uppercase mb-1.5">Group Trail Pace Multiplier</label>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <button 
                            onClick={() => setPlanPace(1.3)}
                            className={`p-2 rounded-lg border transition font-medium flex flex-col items-center text-center ${
                              planPace === 1.3 
                                ? 'border-monokai-yellow bg-monokai-active' 
                                : 'border-monokai-hover bg-monokai-bg hover:bg-monokai-hover'
                            }`}
                          >
                            <span className={planPace === 1.3 ? 'text-monokai-yellow' : 'text-monokai-text'}>Leisurely</span>
                            <span className="text-[9px] text-monokai-dim font-mono">130% Time</span>
                          </button>
                          
                          <button 
                            onClick={() => setPlanPace(1.0)}
                            className={`p-2 rounded-lg border transition font-medium flex flex-col items-center text-center ${
                              planPace === 1.0 
                                ? 'border-monokai-yellow bg-monokai-active' 
                                : 'border-monokai-hover bg-monokai-bg hover:bg-monokai-hover'
                            }`}
                          >
                            <span className={planPace === 1.0 ? 'text-monokai-yellow' : 'text-monokai-text'}>Standard</span>
                            <span className="text-[9px] text-monokai-dim font-mono">100% Time</span>
                          </button>
                          
                          <button 
                            onClick={() => setPlanPace(0.75)}
                            className={`p-2 rounded-lg border transition font-medium flex flex-col items-center text-center ${
                              planPace === 0.75 
                                ? 'border-monokai-yellow bg-monokai-active' 
                                : 'border-monokai-hover bg-monokai-bg hover:bg-monokai-hover'
                            }`}
                          >
                            <span className={planPace === 0.75 ? 'text-monokai-green' : 'text-monokai-text'}>Speedy</span>
                            <span className="text-[9px] text-monokai-dim font-mono">75% Time</span>
                          </button>
                        </div>
                      </div>

                      {/* Dedicated Print Action Button */}
                      <div className="pt-3 border-t border-monokai-hover">
                        <button 
                          onClick={triggerPrintSingle}
                          className="w-full bg-monokai-yellow hover:bg-monokai-yellow/90 text-monokai-deep font-bold py-3 px-4 rounded-xl transition flex items-center justify-center space-x-2 text-sm shadow"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Print Active Itinerary Plan</span>
                        </button>
                      </div>
                    </div>

                    {/* Weather & Timeline */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Subalpine Weather details */}
                      {activeWeather && (
                        <div className="bg-monokai-card p-5 rounded-2xl border border-monokai-hover bg-gradient-to-br from-monokai-card to-monokai-deep">
                          <h4 className="text-[11px] font-mono text-monokai-dim uppercase tracking-wider mb-3">
                            Elevation-Aware Subalpine Weather
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            <div className={`md:col-span-4 flex items-center space-x-3 border-b md:border-b-0 md:border-r border-monokai-hover/50 pb-3 md:pb-0 pr-0 md:pr-4`}>
                              <div className={`p-4 rounded-xl flex items-center justify-center ${activeWeather.colorClass}`}>
                                {activeWeather.icon === 'snowflake' && <Snowflake className="w-10 h-10" />}
                                {activeWeather.icon === 'sun' && <Sun className="w-10 h-10" />}
                                {activeWeather.icon === 'cloud-rain' && <CloudRain className="w-10 h-10" />}
                                {activeWeather.icon === 'cloud-snow' && <CloudSnow className="w-10 h-10" />}
                                {activeWeather.icon === 'cloud' && <Cloud className="w-10 h-10" />}
                              </div>
                              <div>
                                <span className="text-3xl font-extrabold text-monokai-text">{activeWeather.temp}°C</span>
                                <span className="block text-[11px] font-mono text-monokai-dim uppercase mt-0.5">{activeWeather.conditions}</span>
                              </div>
                            </div>
                            <div className="md:col-span-8 space-y-1.5">
                              <p className="text-xs text-monokai-dim flex justify-between">
                                <span>Subalpine Temp Drop (vs city):</span>
                                <span className="font-mono text-monokai-pink font-semibold">-{activeWeather.lapse}°C Peak Offset</span>
                              </p>
                              <p className="text-xs text-monokai-dim flex justify-between">
                                <span>Simulated Altitude Wind gust:</span>
                                <span className="font-mono text-monokai-blue font-semibold">{activeWeather.wind} km/h</span>
                              </p>
                              <div className={`text-xs p-2.5 rounded-lg mt-2 font-medium ${activeWeather.colorClass}`}>
                                {activeWeather.advice}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Vertical timeline */}
                      {activeTimeline && (
                        <div className="bg-monokai-card p-5 rounded-2xl border border-monokai-hover space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-mono text-monokai-dim uppercase tracking-wider">Dynamic Timeline Schedule</h4>
                            
                            {/* Sunset alert pill */}
                            {activeTimeline.isAfterSunset && (
                              <div id="sunset-alert-pill" className="flex items-center space-x-1.5 bg-monokai-pink/10 border border-monokai-pink/30 px-3 py-1 rounded-full animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-monokai-pink"></span>
                                <span className="text-[10px] font-mono text-monokai-pink uppercase font-semibold">Sunset Alert</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-monokai-hover">
                            {/* Step 1 */}
                            <div className="flex items-start space-x-4 relative">
                              <div className="w-7 h-7 rounded-full bg-monokai-blue flex items-center justify-center text-monokai-deep z-10 shrink-0 shadow">
                                <ParkingCircle className="w-4 h-4 text-monokai-deep stroke-[2.5]" />
                              </div>
                              <div className="flex-1 bg-monokai-bg p-3 rounded-xl border border-monokai-hover flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-semibold text-monokai-text">Depart Parking Lot & Start Climb</span>
                                  <span className="block text-[10px] text-monokai-dim font-mono">Verify equipment checklist and water supply</span>
                                </div>
                                <span className="text-sm font-mono text-monokai-blue font-bold shrink-0 pl-2">
                                  {formatDecimalHour(activeTimeline.timeDepart)}
                                </span>
                              </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex items-start space-x-4 relative">
                              <div className="w-7 h-7 rounded-full bg-monokai-pink flex items-center justify-center text-monokai-deep z-10 shrink-0 shadow">
                                <Mountain className="w-4 h-4 text-monokai-deep stroke-[2.5]" />
                              </div>
                              <div className="flex-1 bg-monokai-bg p-3 rounded-xl border border-monokai-hover flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-semibold text-monokai-text">Arrive at Scenic Peak / Viewpoint</span>
                                  <span className="block text-[10px] text-monokai-dim font-mono">
                                    Climb Time: {formatDurationText(activeTimeline.ascentDuration)}
                                  </span>
                                </div>
                                <span className="text-sm font-mono text-monokai-pink font-bold shrink-0 pl-2">
                                  {formatDecimalHour(activeTimeline.timeSummit)}
                                </span>
                              </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex items-start space-x-4 relative">
                              <div className="w-7 h-7 rounded-full bg-monokai-purple flex items-center justify-center text-monokai-deep z-10 shrink-0 shadow">
                                <Clock className="w-4 h-4 text-monokai-deep stroke-[2.5]" />
                              </div>
                              <div className="flex-1 bg-monokai-bg p-3 rounded-xl border border-monokai-hover flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-semibold text-monokai-text">Begin Descending Route</span>
                                  <span className="block text-[10px] text-monokai-dim font-mono">
                                    Linger: {planLinger} mins at peak
                                  </span>
                                </div>
                                <span className="text-sm font-mono text-monokai-purple font-bold shrink-0 pl-2">
                                  {formatDecimalHour(activeTimeline.timeDescent)}
                                </span>
                              </div>
                            </div>

                            {/* Step 4 */}
                            <div className="flex items-start space-x-4 relative">
                              <div className="w-7 h-7 rounded-full bg-monokai-green flex items-center justify-center text-monokai-deep z-10 shrink-0 shadow">
                                <Check className="w-4 h-4 text-monokai-deep stroke-[2.5]" />
                              </div>
                              <div className="flex-1 bg-monokai-bg p-3 rounded-xl border border-monokai-hover flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-semibold text-monokai-text">Complete Route to Vehicles</span>
                                  <span className="block text-[10px] text-monokai-dim font-mono">
                                    Downhill: {formatDurationText(activeTimeline.descentDuration)}
                                  </span>
                                </div>
                                <span className="text-sm font-mono text-monokai-green font-bold shrink-0 pl-2">
                                  {formatDecimalHour(activeTimeline.timeReturn)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Daylight Sunset Warnings Panel */}
                          {activeTimeline.isAfterSunset && (
                            <div className="bg-monokai-pink/10 border border-monokai-pink/35 p-4 rounded-xl flex items-start space-x-3 text-xs leading-relaxed text-monokai-pink font-semibold">
                              <Info className="w-5 h-5 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="uppercase font-extrabold tracking-wider">⚠️ Day Trip Nightfall Hazard Warning</p>
                                <p>
                                  Calculated return time matches/surpasses local astronomical sunset ({formatDecimalHour(activeTimeline.sunsetDecimal)}).
                                  A minimum of two fully-charged headlamps are required per person. Start earlier to avoid descending in total darkness.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* --- PRINT ONLY TEMPLATES --- */}
      {/* 1. SINGLE HIKE GUIDE */}
      <section 
        className="print-only p-10 text-gray-900 bg-white max-w-4xl mx-auto space-y-8" 
        id="print-single-hike-layout" 
        data-print-mode={printMode}
      >
        <div className="border-b-4 border-gray-900 pb-5 flex justify-between items-end">
          <div>
            <span className="text-xs font-bold tracking-widest text-blue-600 uppercase block mb-1">
              Wilderness Expedition Guide & Schedule
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">PeakPlanner Itinerary</h1>
            <p className="text-xs text-gray-500 mt-0.5">Calculated split schedule for a safe mountain adventure</p>
          </div>
          <div className="text-right font-mono text-[10px] text-gray-500">
            <p className="font-bold text-gray-900">PEAKPLANNER ITINERARY</p>
            <p>Printed: {todayPrintDate}</p>
            <p>Primary Source: VancouverTrails.com</p>
          </div>
        </div>

        {activeHike && activeTimeline && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-8 space-y-4">
                <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">
                  {activeHike.name}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <p><strong>Subalpine Region:</strong> <span className="text-gray-700">{activeHike.region}</span></p>
                  <p><strong>Best Season:</strong> <span className="text-gray-700">{activeHike.season}</span></p>
                </div>
              </div>
              <div className="md:col-span-4 max-h-[140px] rounded-xl overflow-hidden border border-gray-200">
                <img 
                  src={activeHike.img} 
                  alt={activeHike.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1200&q=80';
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="border border-gray-200 bg-gray-50 p-4 rounded-2xl text-center shadow-sm">
                <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Target Trail</span>
                <span className="text-sm font-extrabold text-gray-900 block truncate">{activeHike.name}</span>
              </div>
              <div className="border border-gray-200 bg-gray-50 p-4 rounded-2xl text-center shadow-sm">
                <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Target Date</span>
                <span className="text-sm font-extrabold text-gray-900 block">{formattedPrintDate()}</span>
              </div>
              <div className="border border-gray-200 bg-gray-50 p-4 rounded-2xl text-center shadow-sm">
                <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Round-Trip Distance</span>
                <span className="text-sm font-extrabold text-gray-900 block">{activeHike.distance}</span>
              </div>
              <div className="border border-gray-200 bg-gray-50 p-4 rounded-2xl text-center shadow-sm">
                <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-1">Driving Distance</span>
                <span className="text-sm font-extrabold text-gray-900 block">{activeHike.distFromVan} Mins</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Calculated splits */}
              <div className="border border-gray-200 p-6 rounded-2xl space-y-4 shadow-sm bg-white">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 border-b pb-2 flex items-center justify-between">
                  <span>Calculated Timeline Splits</span>
                  <span className="text-xs font-mono text-gray-400">Pace Corrected ({planPace * 100}%)</span>
                </h3>

                <div className="space-y-4 relative pl-4 before:absolute before:inset-0 before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  <div className="flex items-center justify-between text-xs relative">
                    <span className="absolute left-[-21px] w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white ring-4 ring-blue-50"></span>
                    <span className="font-medium text-gray-700">1. Depart Trailhead Parking Lot</span>
                    <span className="font-mono font-black text-gray-900">{formatDecimalHour(activeTimeline.timeDepart)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs relative">
                    <span className="absolute left-[-21px] w-2.5 h-2.5 rounded-full bg-pink-500 border-2 border-white ring-4 ring-pink-50"></span>
                    <span className="font-medium text-gray-700">2. Reach Summit Vista Point</span>
                    <span className="font-mono font-black text-gray-900">{formatDecimalHour(activeTimeline.timeSummit)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs relative">
                    <span className="absolute left-[-21px] w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-white ring-4 ring-purple-50"></span>
                    <span className="font-medium text-gray-700">3. Begin Descending Route</span>
                    <span className="font-mono font-black text-gray-900">{formatDecimalHour(activeTimeline.timeDescent)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs relative">
                    <span className="absolute left-[-21px] w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white ring-4 ring-green-50"></span>
                    <span className="font-medium text-gray-700">4. Complete Route to Vehicles</span>
                    <span className="font-mono font-black text-gray-900">{formatDecimalHour(activeTimeline.timeReturn)}</span>
                  </div>
                </div>
              </div>

              {/* Logistics */}
              <div className="border border-gray-200 p-6 rounded-2xl space-y-4 shadow-sm bg-white">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 border-b pb-2">Wilderness Logistics</h3>
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="pb-2 border-b border-gray-100">
                    <strong className="uppercase text-gray-500 tracking-wider block text-[9px] mb-0.5">Where to Park Vehicles</strong>
                    <span className="text-gray-800 font-semibold">{activeHike.parking}</span>
                  </div>
                  <div>
                    <strong className="uppercase text-gray-500 tracking-wider block text-[9px] mb-0.5">Designated Gathering Spot</strong>
                    <span className="text-gray-800 font-semibold">{activeHike.meetingPoint}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 p-6 rounded-2xl space-y-3 bg-white shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 border-b pb-2">Trail Navigation Walkthrough</h3>
              <p className="text-xs leading-relaxed text-gray-700 font-medium">{activeHike.instructions}</p>
            </div>
          </>
        )}

        {/* Standard Essentials Checkoff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-gray-200 p-6 rounded-2xl space-y-3 bg-white shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 border-b pb-2">The Ten Essentials Checklist</h3>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-700">
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] font-bold text-gray-400"></span> 1. Navigation (GPS)</div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] font-bold text-gray-400"></span> 2. Headlamp</div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] font-bold text-gray-400"></span> 3. Sun Protection</div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] font-bold text-gray-400"></span> 4. First Aid Kit</div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] font-bold text-gray-400"></span> 5. Multi-Tool</div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] font-bold text-gray-400"></span> 6. Matches / Fire</div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] font-bold text-gray-400"></span> 7. Emergency Shelter</div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] font-bold text-gray-400"></span> 8. Extra Food</div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] font-bold text-gray-400"></span> 9. Extra Water</div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] font-bold text-gray-400"></span> 10. Thermal Layers</div>
            </div>
          </div>

          <div className="border border-red-200 bg-red-50 p-6 rounded-2xl space-y-3 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-wider text-red-900 border-b border-red-100 pb-2">Safety Protocols</h3>
            <p className="text-[11px] text-red-800 font-bold leading-tight">If Lost or Separated:</p>
            <ul className="list-disc pl-4 text-[10px] space-y-1 text-red-800">
              <li><strong>STOP IMMEDIATELY.</strong> Do not stray off marked paths.</li>
              <li>Remain in open areas. Insulate your body from damp ground.</li>
              <li>Dial 911 immediately if any signal is acquired.</li>
              <li>Blow whistles in short groups of three bursts for rescue squads.</li>
            </ul>
          </div>
        </div>

        <div className="border border-gray-200 p-6 rounded-2xl text-[10px] font-mono grid grid-cols-2 gap-6 bg-gray-50 shadow-inner">
          <div className="space-y-3">
            <p className="border-b pb-1"><strong>Group Lead Name:</strong> ____________________________________</p>
            <p className="border-b pb-1"><strong>Emergency Contact Name:</strong> ____________________________</p>
          </div>
          <div className="space-y-3">
            <p className="border-b pb-1"><strong>Emergency Phone Number:</strong> _____________________________</p>
            <p className="border-b pb-1"><strong>Vehicle License Plates:</strong> ________________________________</p>
          </div>
        </div>

        <div className="text-center text-[10px] text-gray-400 font-mono pt-4">
          Always leave a physical copy of this itinerary document on your vehicle's dashboard.
        </div>
      </section>

      {/* 2. WISHLIST DOSSIER */}
      <section 
        className="print-only p-10 text-gray-900 bg-white max-w-4xl mx-auto space-y-8" 
        id="print-wishlist-layout"
        data-print-mode={printMode}
      >
        <div className="border-b-4 border-gray-900 pb-5 flex justify-between items-end">
          <div>
            <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase block mb-1">
              Adventure Catalog & Completion Logs
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">Hike Wishlist Dossier</h1>
            <p className="text-xs text-gray-500 mt-0.5">Selected hikes and priorities generated via PeakPlanner</p>
          </div>
          <div className="text-right font-mono text-[10px] text-gray-500">
            <p className="font-bold text-gray-900">WISHLIST PORTFOLIO</p>
            <p>Printed: {todayPrintDate}</p>
            <p>Primary Source: VancouverTrails.com</p>
          </div>
        </div>

        <div className="border border-gray-200 p-4 bg-gray-50 rounded-2xl flex justify-around items-center text-xs font-mono shadow-sm">
          <div className="text-center">
            <span className="text-gray-400 text-[10px] uppercase block mb-0.5">Total Listed Trails</span>
            <span className="font-extrabold text-lg text-gray-900">{getSortedWishlistItems().length}</span>
          </div>
          <div className="h-8 w-px bg-gray-200"></div>
          <div className="text-center">
            <span className="text-gray-400 text-[10px] uppercase block mb-0.5">Completed Adventures</span>
            <span className="font-extrabold text-lg text-emerald-600">
              {getSortedWishlistItems().filter(h => wishlist[h.id]?.completed).length}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 border-b pb-2">Customized Expedition Directory</h3>
          <div className="space-y-4">
            {getSortedWishlistItems().map((hike, idx) => {
              const item = wishlist[hike.id] || {};
              const isCompleted = !!item.completed;
              const completionClass = isCompleted ? "line-through text-gray-400 opacity-60" : "text-gray-900";

              return (
                <div key={hike.id} className="border border-gray-200 p-4 rounded-2xl print-card space-y-2 text-xs bg-white shadow-sm">
                  <div className={`flex justify-between items-center border-b pb-2 font-bold ${completionClass}`}>
                    <span className="text-sm font-extrabold flex items-center gap-2">
                      <span className="font-mono text-gray-400">{isCompleted ? '✓' : '□'}</span>
                      Priority #{idx + 1}: {hike.name} <span className="text-xs font-normal text-gray-400">({hike.region})</span>
                    </span>
                    <span className={`text-[9px] font-mono tracking-wider uppercase px-2 py-0.5 rounded ${
                      isCompleted ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isCompleted ? 'Completed' : 'Planned'}
                    </span>
                  </div>
                  
                  <div className={`grid grid-cols-4 gap-2 text-[10px] font-mono text-gray-600 py-1 border-b border-gray-100 ${
                    isCompleted ? 'line-through text-gray-400 opacity-60' : ''
                  }`}>
                    <div>Distance: <b className="text-gray-900">{hike.distance}</b></div>
                    <div>Duration: <b className="text-gray-900">{hike.duration} hrs</b></div>
                    <div>Gain: <b className="text-gray-900">{hike.elevation}m</b></div>
                    <div>Drive: <b className="text-gray-900">{hike.distFromVan} mins</b></div>
                  </div>
                  
                  {item.comment && (
                    <div className={`bg-amber-50/50 p-2.5 rounded-xl italic text-xs text-gray-700 border-l-4 border-amber-400 my-1 ${
                      isCompleted ? 'line-through text-gray-400 opacity-40' : ''
                    }`}>
                      <strong>Personal Note:</strong> "{item.comment}"
                    </div>
                  )}
                  
                  <div className={`text-[10px] text-gray-500 leading-relaxed pt-1 ${
                    isCompleted ? 'line-through text-gray-400 opacity-40' : ''
                  }`}>
                    <strong className="text-gray-800 uppercase text-[9px] tracking-wider block mb-0.5">Route Walkthrough Summary:</strong> 
                    {hike.instructions}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center text-[10px] text-gray-400 font-mono pt-6 border-t border-gray-200">
          Generated via PeakPlanner. Pack safe, respect trail conditions, and leave no trace.
        </div>
      </section>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all duration-300 transform translate-y-0 ${
          toast.isError ? 'bg-monokai-pink text-monokai-deep' : 'bg-monokai-green text-monokai-deep'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
