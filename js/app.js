/**
 * Aether NYC - Core Client-Side Application Script (Phase 2 Expanded)
 * 
 * Handles state management, dynamic custom calendar, reservation CRUD,
 * floor plan interactive SVG, seasonal timelines, sommelier palate matching,
 * experience enhancements, gifting card templates, and UI animations.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- STATE MANAGEMENT ---
    let state = {
        bookings: [],
        displayedBookings: [],
        currentMonth: new Date(),
        selectedDate: null,
        selectedTimeSlot: null,
        selectedSeatType: null, // 'counter', 'banquette', 'alcove'
        selectedUpgrades: [], // Array of upgrade IDs: 'upgrade-cellar', 'upgrade-flowers', 'upgrade-cookbook'
        reschedulingBookingId: null,
        rescheduleMonth: new Date(),
        rescheduleSelectedDate: null,
        rescheduleSelectedTime: null,
        cart: {},
        activeTestimonial: 0,
        activeTimelineMonth: 0
    };

    // --- SUPABASE CONFIGURATION ---
    const SUPABASE_PROJECT_REF = "pedntrxasffdnmimkbbn"; 
    const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
    const SUPABASE_ANON_KEY = "sb_publishable_J-nZkoITLxUvtQexNJynrQ_mgci7KbP";
    
    let supabase = null;
    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    } catch (e) {
        console.error("Failed to initialize Supabase:", e);
    }

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${year}-${month}-${day}`;
    };

    // Helper: Generate dynamic Google Calendar template link
    const generateGoogleCalendarLink = (booking) => {
        const title = encodeURIComponent("Reservation at Aether NYC");
        const details = encodeURIComponent(
            `Confirmation Code: ${booking.id}\n` +
            `Guests: ${booking.guests}\n` +
            `Seating Zone: ${booking.seatType}\n` +
            `Special Occasion: ${booking.occasion || 'None'}\n` +
            `Dietary Notes: ${booking.dietary || 'None'}\n\n` +
            `Organizer: sehgal.sid16@gmail.com`
        );
        
        const dateObj = new Date(booking.date);
        const timeStr = booking.time;
        let hours = 19;
        let minutes = 0;
        
        const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
        if (match) {
            hours = parseInt(match[1]);
            minutes = parseInt(match[2]);
            const ampm = match[3].toUpperCase();
            if (ampm === "PM" && hours < 12) hours += 12;
            if (ampm === "AM" && hours === 12) hours = 0;
        }
        
        const startDateTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hours, minutes);
        const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours
        
        const formatCalDate = (d) => {
            return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        };
        
        const dates = `${formatCalDate(startDateTime)}/${formatCalDate(endDateTime)}`;
        const location = encodeURIComponent("Aether NYC, New York City, NY");
        
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&add=sehgal.sid16@gmail.com`;
    };

    // Load initial fallback bookings
    const initLocalStorage = () => {
        const stored = localStorage.getItem("aether_bookings");
        if (stored) {
            state.bookings = JSON.parse(stored).map(b => {
                if (b.date) b.date = new Date(b.date);
                return b;
            });
        } else {
            const seedDate = new Date();
            seedDate.setDate(seedDate.getDate() + 3);
            if (seedDate.getDay() === 0) seedDate.setDate(seedDate.getDate() + 2);
            if (seedDate.getDay() === 1) seedDate.setDate(seedDate.getDate() + 1);
            
            const seedBooking = {
                id: "AE-2026-F982",
                name: "Eleanor Sterling",
                phone: "(212) 555-0198",
                email: "eleanor.s@vogue.com",
                date: seedDate,
                time: "7:00 PM",
                guests: 2,
                seatType: "banquette",
                upgrades: ["upgrade-cellar"],
                occasion: "Date Night",
                dietary: "No shellfish, please.",
                createdAt: new Date().toISOString()
            };
            state.bookings = [seedBooking];
            saveBookingsToStorage();
        }
    };

    const saveBookingsToStorage = () => {
        localStorage.setItem("aether_bookings", JSON.stringify(state.bookings));
    };

    // --- DOM ELEMENT CACHE ---
    const elements = {
        header: document.querySelector(".nav-header"),
        mobileToggle: document.querySelector(".mobile-toggle"),
        navMenu: document.querySelector(".nav-menu"),
        navLinks: document.querySelectorAll(".nav-link"),
        
        // Tasting Menu Tabs & Sommelier Palate Assistant
        menuTabTasting: document.getElementById("tab-tasting"),
        menuTabPairings: document.getElementById("tab-pairings"),
        menuPaneTasting: document.getElementById("pane-tasting"),
        menuPanePairings: document.getElementById("pane-pairings"),
        sommToggleBtn: document.getElementById("somm-toggle-btn"),
        sommInterface: document.getElementById("somm-interface"),
        sommOptionBtns: document.querySelectorAll(".somm-option-btn"),
        sommResultPanel: document.getElementById("somm-result-panel"),
        
        // Custom Calendar
        calendarMonthLabel: document.getElementById("cal-month"),
        calendarPrevBtn: document.getElementById("cal-prev"),
        calendarNextBtn: document.getElementById("cal-next"),
        calendarDaysGrid: document.getElementById("cal-days"),
        timeSlotsGrid: document.getElementById("time-slots-grid"),
        timeSlotsWrapper: document.getElementById("time-slots-container"),
        
        // Step 2: Floorplan Seating
        floorplanWrapper: document.getElementById("floorplan-wrapper"),
        seatNodes: document.querySelectorAll(".seat-node"),
        seatingDesc: document.getElementById("selected-seating-desc"),
        
        // Step 3: Booking Form & Upgrades
        bookingForm: document.getElementById("reservation-form"),
        inputName: document.getElementById("reserve-name"),
        inputPhone: document.getElementById("reserve-phone"),
        inputEmail: document.getElementById("reserve-email"),
        inputGuests: document.getElementById("reserve-guests"),
        inputOccasion: document.getElementById("reserve-occasion"),
        inputDietary: document.getElementById("reserve-dietary"),
        upgradeCards: document.querySelectorAll(".upgrade-card"),
        depositBreakdown: document.getElementById("deposit-breakdown"),
        submitBtn: document.getElementById("submit-booking-btn"),
        
        // Manage Bookings
        bookingsList: document.getElementById("bookings-list"),
        manageEmpty: document.getElementById("manage-empty"),
        
        // At Home Takeaway & Gifting Tabs
        homeTabTakeaway: document.getElementById("home-tab-takeaway"),
        homeTabGifting: document.getElementById("home-tab-gifting"),
        paneTakeaway: document.getElementById("pane-takeaway"),
        paneGifting: document.getElementById("pane-gifting"),
        
        // Takeaway Cart
        shopItemsList: document.getElementById("shop-items-list"),
        cartSummary: document.getElementById("cart-summary-items"),
        cartSubtotal: document.getElementById("cart-subtotal"),
        cartTotal: document.getElementById("cart-total"),
        placeOrderBtn: document.getElementById("place-order-btn"),
        
        // Gifting Suite
        inputGiftTo: document.getElementById("gift-to"),
        inputGiftFrom: document.getElementById("gift-from"),
        inputGiftPkg: document.getElementById("gift-package-select"),
        inputGiftMsg: document.getElementById("gift-message"),
        previewGiftPkg: document.getElementById("gift-card-package-preview"),
        previewGiftTo: document.getElementById("gift-card-to-preview"),
        previewGiftFrom: document.getElementById("gift-card-from-preview"),
        previewGiftMsg: document.getElementById("gift-card-message-preview"),
        purchaseGiftBtn: document.getElementById("purchase-gift-btn"),
        
        // Testimonials
        testimonialSlides: document.querySelectorAll(".testimonial-slide"),
        testimonialDots: document.querySelectorAll(".testimonial-dot"),
        
        // Micro-Seasons Foraging Timeline
        timelineSlider: document.getElementById("timeline-slider"),
        timelineTickLabels: document.querySelectorAll(".timeline-tick-label"),
        timelineMonthLabel: document.getElementById("timeline-card-month"),
        timelineCropLabel: document.getElementById("timeline-card-crop"),
        timelineDesc: document.getElementById("timeline-card-desc"),
        timelineImg: document.getElementById("timeline-card-img"),
        
        // Modals
        bookingSuccessModal: document.getElementById("modal-booking-success"),
        rescheduleModal: document.getElementById("modal-reschedule"),
        cancelModal: document.getElementById("modal-cancel-confirm"),
        takeawaySuccessModal: document.getElementById("modal-takeaway-success"),
        syncLoadingModal: document.getElementById("modal-sync-loading"),
        
        // Toast Container
        toastContainer: document.getElementById("toast-container")
    };

    // --- STICKY NAV & ACTIVE LINKS ---
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            elements.header.classList.add("scrolled");
        } else {
            elements.header.classList.remove("scrolled");
        }
        
        let current = "";
        const sections = document.querySelectorAll("section[id]");
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute("id");
            }
        });

        elements.navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${current}`) {
                link.classList.add("active");
            }
        });
    });

    // Mobile menu toggle
    if (elements.mobileToggle) {
        elements.mobileToggle.addEventListener("click", () => {
            elements.mobileToggle.classList.toggle("active");
            elements.navMenu.classList.toggle("active");
        });
    }

    elements.navLinks.forEach(link => {
        link.addEventListener("click", () => {
            elements.mobileToggle.classList.remove("active");
            elements.navMenu.classList.remove("active");
        });
    });

    // --- MENU TABS ---
    const switchMenuTab = (tab) => {
        if (tab === "tasting") {
            elements.menuTabTasting.classList.add("active");
            elements.menuTabPairings.classList.remove("active");
            elements.menuPaneTasting.classList.add("active");
            elements.menuPanePairings.classList.remove("active");
        } else {
            elements.menuTabTasting.classList.remove("active");
            elements.menuTabPairings.classList.add("active");
            elements.menuPaneTasting.classList.remove("active");
            elements.menuPanePairings.classList.add("active");
        }
    };

    if (elements.menuTabTasting) {
        elements.menuTabTasting.addEventListener("click", () => switchMenuTab("tasting"));
    }
    if (elements.menuTabPairings) {
        elements.menuTabPairings.addEventListener("click", () => switchMenuTab("pairings"));
    }

    // --- FEATURE 2: VIRTUAL SOMMELIER PALATE ASSISTANT ---
    if (elements.sommToggleBtn) {
        elements.sommToggleBtn.addEventListener("click", () => {
            const isVisible = window.getComputedStyle(elements.sommInterface).display !== "none";
            if (isVisible) {
                elements.sommInterface.style.display = "none";
                elements.sommToggleBtn.textContent = "Consult Virtual Sommelier";
            } else {
                elements.sommInterface.style.display = "block";
                elements.sommToggleBtn.textContent = "Close Sommelier Assistant";
                elements.sommInterface.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    elements.sommOptionBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            // Highlight selected button
            elements.sommOptionBtns.forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            
            const palate = btn.getAttribute("data-palate");
            const data = window.AetherData.sommelierAssistantData[palate];
            
            if (data) {
                document.getElementById("somm-wine-name").textContent = data.wine;
                document.getElementById("somm-wine-notes").textContent = data.notes;
                document.getElementById("somm-wine-price").textContent = data.price;
                
                elements.sommResultPanel.style.display = "block";
                elements.sommResultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                showToast("Sommelier Pairing Chosen", `Recommended: ${data.wine}`);
            }
        });
    });

    // --- FEATURE 3: MICRO-SEASONS TIMELINE SLIDER ---
    const updateTimelineCard = (monthIndex) => {
        const item = window.AetherData.seasonalTimelineData[monthIndex];
        if (!item) return;
        
        state.activeTimelineMonth = monthIndex;
        
        // Transition card with temporary class to trigger reflow
        elements.timelineMonthLabel.textContent = item.month;
        elements.timelineCropLabel.textContent = item.crop;
        elements.timelineDesc.textContent = item.desc;
        elements.timelineImg.src = item.image;
        elements.timelineImg.alt = `Seasonal crop foraging in Aether NYC: ${item.crop}`;
        
        // Highlight active tick label
        elements.timelineTickLabels.forEach((label, idx) => {
            label.classList.remove("active");
            if (idx === monthIndex) {
                label.classList.add("active");
            }
        });
    };

    if (elements.timelineSlider) {
        elements.timelineSlider.addEventListener("input", (e) => {
            updateTimelineCard(parseInt(e.target.value));
        });
        
        elements.timelineTickLabels.forEach((tick, idx) => {
            tick.addEventListener("click", () => {
                elements.timelineSlider.value = idx;
                updateTimelineCard(idx);
            });
        });
    }

    // --- TOAST NOTIFICATIONS ---
    const showToast = (title, message) => {
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `
            <div class="toast-body">
                <span class="toast-title">${title}</span>
                <span class="toast-msg">${message}</span>
            </div>
            <button class="toast-close" aria-label="Close Toast Alert">&times;</button>
        `;
        
        elements.toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add("active"), 10);
        
        const removeToast = () => {
            toast.classList.remove("active");
            setTimeout(() => toast.remove(), 400);
        };
        
        toast.querySelector(".toast-close").addEventListener("click", removeToast);
        setTimeout(removeToast, 4000);
    };

    // --- CALENDAR ENGINE ---
    const renderCalendar = (container, monthState, selectedDateState, onDateClick) => {
        if (!container) return;
        
        container.innerHTML = "";
        
        const year = monthState.getFullYear();
        const month = monthState.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        for (let i = 0; i < firstDayOfMonth; i++) {
            const blank = document.createElement("div");
            blank.className = "calendar-day empty";
            container.appendChild(blank);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const dayBtn = document.createElement("button");
            dayBtn.type = "button";
            dayBtn.className = "calendar-day";
            
            const dateStr = currentDate.toDateString();
            dayBtn.innerHTML = `<span>${day}</span>`;
            
            if (currentDate < today) {
                dayBtn.classList.add("past");
            } else {
                const availability = window.AetherData.getAvailabilityForDate(currentDate);
                
                if (availability === "closed") {
                    dayBtn.classList.add("past");
                    dayBtn.title = "Restaurant is closed (Sundays & Mondays)";
                } else if (availability === "booked") {
                    dayBtn.classList.add("booked");
                    dayBtn.title = "Fully Booked";
                } else {
                    if (availability === "limited") {
                        const indicator = document.createElement("span");
                        indicator.className = "calendar-day-indicator limited";
                        dayBtn.appendChild(indicator);
                        dayBtn.title = "Limited Seating Available";
                    } else {
                        dayBtn.title = "Reservations Available";
                    }
                    
                    if (selectedDateState && dateStr === selectedDateState.toDateString()) {
                        dayBtn.classList.add("selected");
                    }
                    
                    dayBtn.addEventListener("click", () => {
                        onDateClick(currentDate);
                    });
                }
            }
            
            container.appendChild(dayBtn);
        }
    };

    // --- LIVE AVAILABILITY STATE ---
    let monthAvailabilityMap = {};
    let dayReservations = [];

    const loadMonthAvailability = async (monthState) => {
        monthAvailabilityMap = {};
        if (!supabase) return;
        
        try {
            const year = monthState.getFullYear();
            const month = monthState.getMonth();
            const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const end = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
            
            const { data, error } = await supabase
                .from('reservations')
                .select('date, status')
                .neq('status', 'cancelled')
                .gte('date', start)
                .lte('date', end);
                
            if (error) throw error;
            
            data.forEach(b => {
                const dateStr = new Date(b.date + "T00:00:00").toDateString();
                monthAvailabilityMap[dateStr] = (monthAvailabilityMap[dateStr] || 0) + 1;
            });
        } catch (e) {
            console.error("Error loading month availability:", e);
        }
    };

    const loadDayReservations = async (date) => {
        dayReservations = [];
        if (!supabase) return;
        
        try {
            const { data, error } = await supabase
                .from('reservations')
                .select('time, seat_type, guests')
                .eq('date', formatDate(date))
                .neq('status', 'cancelled');
            if (error) throw error;
            dayReservations = data;
        } catch (e) {
            console.error("Error loading day reservations:", e);
        }
    };

    const checkZoneAvailability = (seatId) => {
        if (!state.selectedDate || !state.selectedTimeSlot) return true;
        
        const slotBookings = dayReservations.filter(b => b.time === state.selectedTimeSlot);
        
        if (seatId === 'counter') {
            const counterGuests = slotBookings.filter(b => b.seat_type === 'counter').reduce((sum, b) => sum + b.guests, 0);
            const currentParty = parseInt(elements.inputGuests.value) || 2;
            if (counterGuests + currentParty > 6) {
                showToast("Seating Unavailable", "Chef's Counter cannot accommodate your party size for this time slot.");
                return false;
            }
        } else if (seatId === 'banquette') {
            const banquetteCount = slotBookings.filter(b => b.seat_type === 'banquette').length;
            if (banquetteCount >= 2) {
                showToast("Seating Unavailable", "Dining Room Banquettes are fully committed for this time slot.");
                return false;
            }
        } else if (seatId === 'alcove') {
            const alcoveCount = slotBookings.filter(b => b.seat_type === 'alcove').length;
            if (alcoveCount >= 2) {
                showToast("Seating Unavailable", "Window Alcove Tables are fully committed for this time slot.");
                return false;
            }
        }
        return true;
    };

    const updateBookingCalendar = async () => {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        elements.calendarMonthLabel.textContent = `${months[state.currentMonth.getMonth()]} ${state.currentMonth.getFullYear()}`;
        
        await loadMonthAvailability(state.currentMonth);
        
        renderCalendar(
            elements.calendarDaysGrid,
            state.currentMonth,
            state.selectedDate,
            (clickedDate) => {
                state.selectedDate = clickedDate;
                state.selectedTimeSlot = null;
                updateBookingCalendar();
                
                loadDayReservations(clickedDate).then(() => {
                    renderTimeSlots(clickedDate, elements.timeSlotsGrid, (slot) => {
                        state.selectedTimeSlot = slot;
                        elements.floorplanWrapper.style.display = "block";
                        elements.floorplanWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        
                        // Reset table selection on slot change
                        state.selectedSeatType = null;
                        elements.seatNodes.forEach(n => n.classList.remove("selected"));
                        elements.seatingDesc.innerHTML = `<span style="font-size:0.75rem; color:var(--color-secondary);">Click on a seating area on the floor plan map to check descriptions & secure your spot.</span>`;
                        
                        recalcReservationSummary();
                    }, state.selectedTimeSlot);
                });
            }
        );
    };

    const renderTimeSlots = (date, container, onSelectSlot, selectedSlot) => {
        container.innerHTML = "";
        elements.timeSlotsWrapper.style.display = "block";
        const dateSeed = date.getDate();
        
        window.AetherData.timeSlots.forEach((slot, index) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "time-slot";
            btn.textContent = slot.time;
            
            let availability = slot.baseAvailability;
            
            if (dayReservations && dayReservations.length > 0) {
                const slotBookings = dayReservations.filter(b => b.time === slot.time);
                const counterGuests = slotBookings.filter(b => b.seat_type === 'counter').reduce((sum, b) => sum + b.guests, 0);
                const banquetteCount = slotBookings.filter(b => b.seat_type === 'banquette').length;
                const alcoveCount = slotBookings.filter(b => b.seat_type === 'alcove').length;
                
                const isCounterFull = counterGuests >= 6;
                const isBanquetteFull = banquetteCount >= 2;
                const isAlcoveFull = alcoveCount >= 2;
                
                if (isCounterFull && isBanquetteFull && isAlcoveFull) {
                    availability = "booked";
                } else if (isCounterFull || isBanquetteFull || isAlcoveFull) {
                    availability = "limited";
                } else {
                    availability = "available";
                }
            } else {
                if ((dateSeed + index) % 5 === 0) {
                    availability = "booked";
                } else if ((dateSeed + index) % 4 === 0) {
                    availability = "limited";
                }
            }
            
            if (availability === "booked") {
                btn.classList.add("booked");
                btn.disabled = true;
            } else {
                if (availability === "limited") {
                    btn.classList.add("limited");
                }
                
                if (selectedSlot === slot.time) {
                    btn.classList.add("selected");
                }
                
                btn.addEventListener("click", () => {
                    container.querySelectorAll(".time-slot").forEach(b => b.classList.remove("selected"));
                    btn.classList.add("selected");
                    onSelectSlot(slot.time);
                });
            }
            container.appendChild(btn);
        });
    };

    if (elements.calendarPrevBtn) {
        elements.calendarPrevBtn.addEventListener("click", () => {
            state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
            updateBookingCalendar();
        });
    }
    
    if (elements.calendarNextBtn) {
        elements.calendarNextBtn.addEventListener("click", () => {
            state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
            updateBookingCalendar();
        });
    }

    // --- FEATURE 1: INTERACTIVE FLOOR PLAN ---
    elements.seatNodes.forEach(node => {
        node.addEventListener("click", () => {
            if (node.classList.contains("booked")) return;
            
            const seatId = node.getAttribute("data-seat");
            
            // Check Live Availability
            if (!checkZoneAvailability(seatId)) return;
            
            elements.seatNodes.forEach(n => n.classList.remove("selected"));
            node.classList.add("selected");
            
            state.selectedSeatType = seatId;
            
            const details = window.AetherData.seatingLocations[seatId];
            if (details) {
                elements.seatingDesc.innerHTML = `
                    <strong class="text-gold" style="display:block; margin-bottom:4px;">${details.name}</strong>
                    <span style="font-size:0.8rem; color:var(--color-secondary);">${details.desc}</span>
                `;
                
                showToast("Table Area Chosen", details.name);
                recalcReservationSummary();
            }
        });
    });

    // --- FEATURE 4: BOOKING EXPERIENCE UPGRADES ---
    elements.upgradeCards.forEach(card => {
        card.addEventListener("click", () => {
            const upgradeId = card.getAttribute("data-upgrade");
            const index = state.selectedUpgrades.indexOf(upgradeId);
            
            if (index === -1) {
                state.selectedUpgrades.push(upgradeId);
                card.classList.add("active");
                card.querySelector(".upgrade-checkbox").textContent = "✓";
                showToast("Upgrade Added", card.querySelector(".upgrade-card-title").textContent);
            } else {
                state.selectedUpgrades.splice(index, 1);
                card.classList.remove("active");
                card.querySelector(".upgrade-checkbox").textContent = "";
            }
            recalcReservationSummary();
        });
    });

    if (elements.inputGuests) {
        elements.inputGuests.addEventListener("change", () => recalcReservationSummary());
    }

    const recalcReservationSummary = () => {
        if (!elements.depositBreakdown) return;
        
        const guests = parseInt(elements.inputGuests.value) || 1;
        const dateStr = state.selectedDate ? state.selectedDate.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' }) : 'None selected';
        const timeSlot = state.selectedTimeSlot || 'None selected';
        
        let seatLabel = "Not selected";
        if (state.selectedSeatType) {
            const locDetails = window.AetherData.seatingLocations[state.selectedSeatType];
            if (locDetails) seatLabel = locDetails.name;
        }
        
        let enhancements = "None";
        if (state.selectedUpgrades.length > 0) {
            enhancements = state.selectedUpgrades.map(uid => {
                if (uid === "upgrade-cellar") return "Cellar tour";
                if (uid === "upgrade-flowers") return "Floral arrangement";
                if (uid === "upgrade-cookbook") return "Signed cookbook";
                return "";
            }).filter(x => x !== "").join(", ");
        }
        
        elements.depositBreakdown.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>Date & Time</span>
                <strong>${dateStr} @ ${timeSlot}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>Party Size</span>
                <strong>${guests} Guest${guests > 1 ? 's' : ''}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>Seating Zone</span>
                <strong>${seatLabel}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--color-border); padding-top:6px; margin-top:6px;">
                <span>Enhancements</span>
                <strong>${enhancements}</strong>
            </div>
        `;
        
        elements.submitBtn.textContent = `Confirm Reservation`;
    };

    // --- RESERVATION CREATION ---
    if (elements.bookingForm) {
        elements.bookingForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            document.querySelectorAll(".form-error").forEach(el => el.textContent = "");
            let hasErrors = false;
            
            const name = elements.inputName.value.trim();
            const phone = elements.inputPhone.value.trim();
            const email = elements.inputEmail.value.trim();
            const guests = parseInt(elements.inputGuests.value);
            const occasion = elements.inputOccasion.value;
            const dietary = elements.inputDietary.value.trim();
            
            if (!name) {
                document.getElementById("err-name").textContent = "Full name is required";
                hasErrors = true;
            }
            if (!phone) {
                document.getElementById("err-phone").textContent = "Contact number is required";
                hasErrors = true;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email) {
                document.getElementById("err-email").textContent = "Email address is required";
                hasErrors = true;
            } else if (!emailRegex.test(email)) {
                document.getElementById("err-email").textContent = "Please enter a valid email address";
                hasErrors = true;
            }
            
            if (!state.selectedDate) {
                document.getElementById("err-datetime").textContent = "Please select a date on the calendar";
                hasErrors = true;
            } else if (!state.selectedTimeSlot) {
                document.getElementById("err-datetime").textContent = "Please select a seating time";
                hasErrors = true;
            }
            
            if (!state.selectedSeatType) {
                document.getElementById("err-datetime").textContent = "Please select a dining area on the floor plan map";
                hasErrors = true;
            }
            
            if (hasErrors) return;
            
            elements.submitBtn.textContent = "Securing Reservation...";
            elements.submitBtn.disabled = true;
            
            const confId = `AE-2026-${Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase()}`;
            const newBooking = {
                id: confId,
                name,
                phone,
                email,
                date: state.selectedDate,
                time: state.selectedTimeSlot,
                guests,
                seatType: state.selectedSeatType,
                upgrades: [...state.selectedUpgrades],
                occasion,
                dietary,
                createdAt: new Date().toISOString()
            };
            
            const finalizeBooking = () => {
                state.bookings.push(newBooking);
                saveBookingsToStorage();
                
                // Add to displayed bookings list instantly
                state.displayedBookings = [newBooking, ...(state.displayedBookings || [])];
                
                // Reset Form
                elements.bookingForm.reset();
                state.selectedDate = null;
                state.selectedTimeSlot = null;
                state.selectedSeatType = null;
                state.selectedUpgrades = [];
                
                elements.timeSlotsWrapper.style.display = "none";
                elements.floorplanWrapper.style.display = "none";
                elements.seatNodes.forEach(n => n.classList.remove("selected"));
                elements.upgradeCards.forEach(c => {
                    c.classList.remove("active");
                    c.querySelector(".upgrade-checkbox").textContent = "";
                });
                
                updateBookingCalendar();
                showSuccessModal(newBooking);
                renderBookingsList(state.displayedBookings);
                
                elements.submitBtn.textContent = "Confirm Reservation";
                elements.submitBtn.disabled = false;
                
                showToast("Reservation Confirmed", `Confirmation sent to ${email}`);
            };

            if (supabase) {
                supabase.from('reservations').insert([{
                    id: newBooking.id,
                    name: newBooking.name,
                    phone: newBooking.phone,
                    email: newBooking.email.toLowerCase(),
                    date: formatDate(newBooking.date),
                    time: newBooking.time,
                    guests: newBooking.guests,
                    seat_type: newBooking.seatType,
                    upgrades: newBooking.upgrades,
                    occasion: newBooking.occasion,
                    dietary: newBooking.dietary,
                    status: 'confirmed'
                }]).then(({ error }) => {
                    if (error) {
                        console.error("Supabase insert error:", error);
                        showToast("Database Error", "Failed to sync. Saving locally.");
                    }
                    finalizeBooking();
                }).catch(err => {
                    console.error("Supabase insert crash:", err);
                    finalizeBooking();
                });
            } else {
                setTimeout(finalizeBooking, 1200);
            }
        });
    }

    const showSuccessModal = (booking) => {
        document.getElementById("success-conf").textContent = booking.id;
        document.getElementById("success-name").textContent = booking.name;
        document.getElementById("success-guests").textContent = `${booking.guests} guest${booking.guests > 1 ? 's' : ''}`;
        
        const dateStr = booking.date.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById("success-date").textContent = dateStr;
        document.getElementById("success-time").textContent = booking.time;
        
        const areaDetails = window.AetherData.seatingLocations[booking.seatType];
        document.getElementById("success-seating").textContent = areaDetails ? areaDetails.name : "Main dining";
        
        const calBtn = document.getElementById("success-google-cal-btn");
        if (calBtn) {
            const newCalBtn = calBtn.cloneNode(true);
            calBtn.parentNode.replaceChild(newCalBtn, calBtn);
            newCalBtn.addEventListener("click", () => {
                const calUrl = generateGoogleCalendarLink(booking);
                window.open(calUrl, "_blank");
                elements.bookingSuccessModal.classList.remove("active");
            });
        }
        
        elements.bookingSuccessModal.classList.add("active");
    };

    // Close success modals
    document.querySelectorAll(".modal-close, .modal-dismiss").forEach(btn => {
        btn.addEventListener("click", () => {
            elements.bookingSuccessModal.classList.remove("active");
            elements.rescheduleModal.classList.remove("active");
            elements.cancelModal.classList.remove("active");
            elements.takeawaySuccessModal.classList.remove("active");
            elements.syncLoadingModal.classList.remove("active");
        });
    });

    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                overlay.classList.remove("active");
            }
        });
    });

    // --- RESERVATION MANAGEMENT (CRUD) ---
    const lookupEmailInput = document.getElementById("lookup-email");
    const lookupBtn = document.getElementById("lookup-btn");
    const errLookup = document.getElementById("err-lookup");

    if (lookupBtn) {
        lookupBtn.addEventListener("click", async () => {
            const email = lookupEmailInput.value.trim();
            if (!email) {
                errLookup.textContent = "Please enter an email address";
                return;
            }
            errLookup.textContent = "";
            lookupBtn.textContent = "Searching...";
            lookupBtn.disabled = true;

            try {
                let fetchedBookings = [];
                if (supabase) {
                    const { data, error } = await supabase
                        .from("reservations")
                        .select("*")
                        .eq("email", email.toLowerCase())
                        .neq("status", "cancelled");
                    if (error) throw error;
                    fetchedBookings = data.map(b => {
                        return {
                            id: b.id,
                            name: b.name,
                            phone: b.phone,
                            email: b.email,
                            date: new Date(b.date + "T00:00:00"),
                            time: b.time,
                            guests: b.guests,
                            seatType: b.seat_type,
                            upgrades: b.upgrades || [],
                            occasion: b.occasion,
                            dietary: b.dietary,
                            status: b.status
                        };
                    });
                } else {
                    fetchedBookings = state.bookings.filter(b => b.email.toLowerCase() === email.toLowerCase());
                }

                state.displayedBookings = fetchedBookings;
                renderBookingsList(fetchedBookings);
                
                if (fetchedBookings.length === 0) {
                    showToast("No Reservations Found", `No active reservations found for ${email}`);
                } else {
                    showToast("Reservations Retrieved", `Found ${fetchedBookings.length} active reservation(s)`);
                }
            } catch (err) {
                console.error("Error fetching bookings:", err);
                const fetchedBookings = state.bookings.filter(b => b.email.toLowerCase() === email.toLowerCase());
                state.displayedBookings = fetchedBookings;
                renderBookingsList(fetchedBookings);
                showToast("Lookup Error", "Retrieved offline reservations.");
            } finally {
                lookupBtn.textContent = "Find Bookings";
                lookupBtn.disabled = false;
            }
        });
    }

    const renderBookingsList = (bookingsToRender) => {
        if (!elements.bookingsList) return;
        
        elements.bookingsList.innerHTML = "";
        
        if (!bookingsToRender || bookingsToRender.length === 0) {
            elements.manageEmpty.style.display = "flex";
            elements.bookingsList.style.display = "none";
            return;
        }
        
        elements.manageEmpty.style.display = "none";
        elements.bookingsList.style.display = "flex";
        
        const sorted = [...bookingsToRender].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        sorted.forEach(booking => {
            const card = document.createElement("div");
            card.className = "booking-item-card";
            
            const bookingDate = new Date(booking.date);
            const dateStr = bookingDate.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            
            const area = window.AetherData.seatingLocations[booking.seatType];
            const areaLabel = area ? area.name : "Main dining";
            
            let enhancements = "";
            if (booking.upgrades && booking.upgrades.length > 0) {
                enhancements = booking.upgrades.map(uid => {
                    if (uid === "upgrade-cellar") return "Cellar tour";
                    if (uid === "upgrade-flowers") return "Floral arrangement";
                    if (uid === "upgrade-cookbook") return "Signed cookbook";
                    return "";
                }).filter(x => x !== "").join(", ");
            }
            
            card.innerHTML = `
                <div class="booking-item-info">
                    <div class="booking-item-conf">Conf: ${booking.id}</div>
                    <div class="booking-item-guest-name">${booking.name}</div>
                    <div class="booking-item-meta">
                        <span>Guests: <strong>${booking.guests}</strong></span>
                        <span>Date: <strong>${dateStr}</strong></span>
                        <span>Time: <strong>${booking.time}</strong></span>
                    </div>
                    <div style="font-size:0.75rem; color:var(--color-secondary); margin-top:0.35rem;">
                        Area: <strong>${areaLabel}</strong> ${enhancements ? `| Upgrades: <strong>${enhancements}</strong>` : ""}
                    </div>
                    ${booking.dietary ? `<div style="font-size:0.75rem; color:var(--color-secondary); margin-top:0.25rem;">Note: ${booking.dietary}</div>` : ''}
                </div>
                <div class="booking-item-actions">
                    <a class="btn btn-secondary btn-small calendar-sync-btn" style="border-color:rgba(212,175,55,0.2); color:var(--color-gold); text-decoration:none; display:inline-flex; align-items:center;" href="${generateGoogleCalendarLink(booking)}" target="_blank">Add to Calendar</a>
                    <button class="btn btn-secondary btn-small reschedule-btn" data-id="${booking.id}">Reschedule</button>
                    <button class="btn btn-secondary btn-small cancel-btn" style="border-color:rgba(217,140,140,0.2); color:var(--color-danger);" data-id="${booking.id}">Cancel</button>
                </div>
            `;
            
            elements.bookingsList.appendChild(card);
        });
        
        elements.bookingsList.querySelectorAll(".cancel-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                bookingIdToCancel = btn.getAttribute("data-id");
                elements.cancelModal.classList.add("active");
            });
        });
        
        elements.bookingsList.querySelectorAll(".reschedule-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                openRescheduleModal(btn.getAttribute("data-id"));
            });
        });
    };

    // Cancellation flow confirm
    let bookingIdToCancel = null;
    const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener("click", () => {
            if (!bookingIdToCancel) return;
            
            const id = bookingIdToCancel;
            const finalizeCancel = () => {
                state.bookings = state.bookings.filter(b => b.id !== id);
                saveBookingsToStorage();
                
                if (state.displayedBookings) {
                    state.displayedBookings = state.displayedBookings.filter(b => b.id !== id);
                }
                
                elements.cancelModal.classList.remove("active");
                showToast("Reservation Released", `Booking ${id} was cancelled.`);
                bookingIdToCancel = null;
                
                renderBookingsList(state.displayedBookings);
                updateBookingCalendar();
            };
            
            if (supabase) {
                confirmCancelBtn.textContent = "Cancelling...";
                confirmCancelBtn.disabled = true;
                
                supabase.from('reservations').update({
                    status: 'cancelled'
                }).eq('id', id).then(({ error }) => {
                    if (error) {
                        console.error("Supabase cancellation error:", error);
                        showToast("Database Error", "Failed to cancel online.");
                    }
                    finalizeCancel();
                }).catch(err => {
                    console.error("Supabase cancellation crash:", err);
                    finalizeCancel();
                }).finally(() => {
                    confirmCancelBtn.textContent = "Confirm Cancellation";
                    confirmCancelBtn.disabled = false;
                });
            } else {
                finalizeCancel();
            }
        });
    }

    // Rescheduling flow
    const openRescheduleModal = (id) => {
        let booking = state.displayedBookings ? state.displayedBookings.find(b => b.id === id) : null;
        if (!booking) {
            booking = state.bookings.find(b => b.id === id);
        }
        if (!booking) return;
        
        state.reschedulingBookingId = id;
        state.rescheduleSelectedDate = new Date(booking.date);
        state.rescheduleSelectedTime = booking.time;
        state.rescheduleMonth = new Date(booking.date);
        
        document.getElementById("resched-name").textContent = booking.name;
        document.getElementById("resched-guests").value = booking.guests;
        
        updateRescheduleCalendar();
        elements.rescheduleModal.classList.add("active");
    };

    const updateRescheduleCalendar = () => {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        document.getElementById("resched-cal-month").textContent = `${months[state.rescheduleMonth.getMonth()]} ${state.rescheduleMonth.getFullYear()}`;
        
        const grid = document.getElementById("resched-cal-days");
        const slotsGrid = document.getElementById("resched-time-slots-grid");
        
        renderCalendar(
            grid,
            state.rescheduleMonth,
            state.rescheduleSelectedDate,
            (clickedDate) => {
                state.rescheduleSelectedDate = clickedDate;
                state.rescheduleSelectedTime = null;
                updateRescheduleCalendar();
                
                loadDayReservations(clickedDate).then(() => {
                    renderTimeSlots(clickedDate, slotsGrid, (slot) => {
                        state.rescheduleSelectedTime = slot;
                    }, state.rescheduleSelectedTime);
                });
            }
        );
        
        if (state.rescheduleSelectedDate) {
            loadDayReservations(state.rescheduleSelectedDate).then(() => {
                renderTimeSlots(state.rescheduleSelectedDate, slotsGrid, (slot) => {
                    state.rescheduleSelectedTime = slot;
                }, state.rescheduleSelectedTime);
            });
        }
    };

    document.getElementById("resched-cal-prev").addEventListener("click", () => {
        state.rescheduleMonth.setMonth(state.rescheduleMonth.getMonth() - 1);
        updateRescheduleCalendar();
    });
    
    document.getElementById("resched-cal-next").addEventListener("click", () => {
        state.rescheduleMonth.setMonth(state.rescheduleMonth.getMonth() + 1);
        updateRescheduleCalendar();
    });

    const submitRescheduleBtn = document.getElementById("submit-reschedule-btn");
    if (submitRescheduleBtn) {
        submitRescheduleBtn.addEventListener("click", () => {
            const id = state.reschedulingBookingId;
            const dispIdx = state.displayedBookings ? state.displayedBookings.findIndex(b => b.id === id) : -1;
            const localIdx = state.bookings.findIndex(b => b.id === id);
            
            if (dispIdx === -1 && localIdx === -1) return;
            
            if (!state.rescheduleSelectedDate || !state.rescheduleSelectedTime) {
                showToast("Reschedule Error", "Please select date and dining slot.");
                return;
            }
            
            const guests = parseInt(document.getElementById("resched-guests").value);
            
            const finalizeReschedule = () => {
                if (localIdx !== -1) {
                    state.bookings[localIdx].date = state.rescheduleSelectedDate;
                    state.bookings[localIdx].time = state.rescheduleSelectedTime;
                    state.bookings[localIdx].guests = guests;
                    saveBookingsToStorage();
                }
                
                if (dispIdx !== -1) {
                    state.displayedBookings[dispIdx].date = state.rescheduleSelectedDate;
                    state.displayedBookings[dispIdx].time = state.rescheduleSelectedTime;
                    state.displayedBookings[dispIdx].guests = guests;
                }
                
                elements.rescheduleModal.classList.remove("active");
                showToast("Rescheduled Successfully", `Booking updated to ${state.rescheduleSelectedDate.toLocaleDateString()} at ${state.rescheduleSelectedTime}.`);
                
                state.reschedulingBookingId = null;
                state.rescheduleSelectedDate = null;
                state.rescheduleSelectedTime = null;
                
                renderBookingsList(state.displayedBookings);
                updateBookingCalendar();
            };
            
            if (supabase) {
                submitRescheduleBtn.textContent = "Updating...";
                submitRescheduleBtn.disabled = true;
                
                supabase.from('reservations').update({
                    date: formatDate(state.rescheduleSelectedDate),
                    time: state.rescheduleSelectedTime,
                    guests: guests,
                    status: 'confirmed'
                }).eq('id', id).then(({ error }) => {
                    if (error) {
                        console.error("Supabase reschedule error:", error);
                        showToast("Database Error", "Failed to reschedule online.");
                    }
                    finalizeReschedule();
                }).catch(err => {
                    console.error("Supabase reschedule query crash:", err);
                    finalizeReschedule();
                }).finally(() => {
                    submitRescheduleBtn.textContent = "Update Reservation";
                    submitRescheduleBtn.disabled = false;
                });
            } else {
                finalizeReschedule();
            }
        });
    }

    // --- CALENDAR SYNC (REPLACED BY DB SYSTEM) ---
    // Section removed and replaced by secure lookup form

    // --- HOME & GIFTING TAB MANAGEMENT ---
    const switchHomeTab = (tab) => {
        if (tab === "takeaway") {
            elements.homeTabTakeaway.classList.add("active");
            elements.homeTabGifting.classList.remove("active");
            elements.paneTakeaway.classList.add("active");
            elements.paneGifting.classList.remove("active");
        } else {
            elements.homeTabTakeaway.classList.remove("active");
            elements.homeTabGifting.classList.add("active");
            elements.paneTakeaway.classList.remove("active");
            elements.paneGifting.classList.add("active");
            
            // Build initial gifting preview
            updateGiftingCardPreview();
        }
    };

    if (elements.homeTabTakeaway) {
        elements.homeTabTakeaway.addEventListener("click", () => switchHomeTab("takeaway"));
    }
    if (elements.homeTabGifting) {
        elements.homeTabGifting.addEventListener("click", () => switchHomeTab("gifting"));
    }

    // --- AT HOME ORDER CART ---
    const updateCartUI = () => {
        if (!elements.cartSummary) return;
        
        elements.cartSummary.innerHTML = "";
        let subtotal = 0;
        
        Object.keys(state.cart).forEach(id => {
            const qty = state.cart[id];
            if (qty <= 0) return;
            
            const item = window.AetherData.atHomeItems.find(i => i.id === id);
            if (!item) return;
            
            const itemCost = item.price * qty;
            subtotal += itemCost;
            
            const row = document.createElement("div");
            row.className = "cart-item-row";
            row.innerHTML = `
                <span>${item.name} (x${qty})</span>
                <span>$${itemCost}</span>
            `;
            elements.cartSummary.appendChild(row);
        });
        
        if (subtotal === 0) {
            elements.cartSummary.innerHTML = `<div style="font-size:0.75rem; color:var(--color-secondary); text-align:center;">Cart is empty. Select items.</div>`;
            elements.placeOrderBtn.disabled = true;
            elements.cartSubtotal.textContent = "$0";
            elements.cartTotal.textContent = "$0";
            return;
        }
        
        elements.placeOrderBtn.disabled = false;
        elements.cartSubtotal.textContent = `$${subtotal}`;
        
        const total = subtotal + 15;
        elements.cartTotal.textContent = `$${total}`;
    };

    const renderShopItems = () => {
        if (!elements.shopItemsList) return;
        
        elements.shopItemsList.innerHTML = "";
        
        window.AetherData.atHomeItems.forEach(item => {
            const card = document.createElement("div");
            card.className = "home-item";
            
            const qty = state.cart[item.id] || 0;
            
            card.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="home-item-img">
                <div class="home-item-details">
                    <h3 class="home-item-name">${item.name}</h3>
                    <p style="font-size:0.8rem; margin-bottom:0.5rem;">${item.description}</p>
                    <div class="home-item-qty">
                        <span class="home-item-price">$${item.price}</span>
                        <div style="display:flex; align-items:center; margin-left:auto;">
                            <button type="button" class="qty-btn dec-qty" data-id="${item.id}">-</button>
                            <span class="qty-val">${qty}</span>
                            <button type="button" class="qty-btn inc-qty" data-id="${item.id}">+</button>
                        </div>
                    </div>
                </div>
            `;
            elements.shopItemsList.appendChild(card);
        });
        
        elements.shopItemsList.querySelectorAll(".inc-qty").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                state.cart[id] = (state.cart[id] || 0) + 1;
                renderShopItems();
                updateCartUI();
            });
        });
        
        elements.shopItemsList.querySelectorAll(".dec-qty").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                if (state.cart[id] && state.cart[id] > 0) {
                    state.cart[id]--;
                    renderShopItems();
                    updateCartUI();
                }
            });
        });
    };

    if (elements.placeOrderBtn) {
        elements.placeOrderBtn.addEventListener("click", () => {
            elements.placeOrderBtn.textContent = "Processing...";
            elements.placeOrderBtn.disabled = true;
            
            const orderNum = `ORD-2026-${Math.floor(100000 + Math.random() * 900000)}`;
            
            let subtotal = 0;
            const cartItems = {};
            Object.keys(state.cart).forEach(id => {
                const qty = state.cart[id];
                if (qty > 0) {
                    const item = window.AetherData.atHomeItems.find(i => i.id === id);
                    if (item) {
                        subtotal += item.price * qty;
                        cartItems[item.name] = qty;
                    }
                }
            });
            const total = subtotal + 15;

            const finalizeOrder = () => {
                document.getElementById("takeaway-order-num").textContent = orderNum;
                elements.takeawaySuccessModal.classList.add("active");
                state.cart = {};
                renderShopItems();
                updateCartUI();
                
                elements.placeOrderBtn.textContent = "Place Takeout Order";
                showToast("Order Placed", `Confirmation receipt ${orderNum} sent.`);
            };

            if (supabase) {
                supabase.from('takeaway_orders').insert([{
                    order_id: orderNum,
                    items: cartItems,
                    subtotal: subtotal,
                    total: total,
                    status: 'pending'
                }]).then(({ error }) => {
                    if (error) console.error("Supabase order error:", error);
                    finalizeOrder();
                }).catch(err => {
                    console.error("Supabase order query crash:", err);
                    finalizeOrder();
                });
            } else {
                setTimeout(finalizeOrder, 1200);
            }
        });
    }

    // --- FEATURE 5: GIFTING INTERACTIVE CARD ENGINE ---
    const updateGiftingCardPreview = () => {
        const toVal = elements.inputGiftTo.value.trim() || "A Cherished Guest";
        const fromVal = elements.inputGiftFrom.value.trim() || "A Generous Benefactor";
        const msgVal = elements.inputGiftMsg.value.trim() || "An invitation to experience a symphony of micro-seasons at Aether NYC.";
        const pkgId = elements.inputGiftPkg.value;
        
        const pkgDetails = window.AetherData.giftPackages.find(p => p.id === pkgId);
        const pkgName = pkgDetails ? `${pkgDetails.name} ($${pkgDetails.price})` : "Seasonal Journey Invitation";
        
        elements.previewGiftTo.textContent = `Presented to: ${toVal}`;
        elements.previewGiftFrom.textContent = `From: ${fromVal}`;
        elements.previewGiftMsg.textContent = `“${msgVal}”`;
        elements.previewGiftPkg.textContent = pkgName;
        
        if (pkgDetails) {
            elements.purchaseGiftBtn.textContent = `Purchase Gift Voucher • $${pkgDetails.price}`;
        }
    };

    if (elements.inputGiftTo) {
        elements.inputGiftTo.addEventListener("input", updateGiftingCardPreview);
        elements.inputGiftFrom.addEventListener("input", updateGiftingCardPreview);
        elements.inputGiftMsg.addEventListener("input", updateGiftingCardPreview);
        elements.inputGiftPkg.addEventListener("change", updateGiftingCardPreview);
    }

    if (elements.purchaseGiftBtn) {
        elements.purchaseGiftBtn.addEventListener("submit", (e) => e.preventDefault());
        elements.purchaseGiftBtn.addEventListener("click", (e) => {
            e.preventDefault();
            
            const toVal = elements.inputGiftTo.value.trim();
            const fromVal = elements.inputGiftFrom.value.trim();
            const msgVal = elements.inputGiftMsg.value.trim();
            const pkgId = elements.inputGiftPkg.value;
            
            if (!toVal || !fromVal) {
                showToast("Gifting Error", "Please provide recipient and sender names.");
                return;
            }
            
            elements.purchaseGiftBtn.textContent = "Processing Gifting Purchase...";
            elements.purchaseGiftBtn.disabled = true;
            
            const voucherCode = `ATH-GIFT-${Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()}`;

            const finalizeGift = () => {
                document.getElementById("takeaway-order-num").textContent = voucherCode;
                
                document.getElementById("takeaway-success-h").textContent = "Gift Card Issued";
                const descPara = document.querySelector("#modal-takeaway-success p");
                if (descPara) descPara.textContent = "Your digital gift invitation has been generated and queued for courier delivery.";
                const detailsContainer = document.querySelector("#modal-takeaway-success .success-details");
                if (detailsContainer) {
                    detailsContainer.innerHTML = `
                        <div class="success-row">
                            <span class="success-label">Voucher Code</span>
                            <span class="success-val" style="color:var(--color-gold); font-weight:600;">${voucherCode}</span>
                        </div>
                        <div class="success-row">
                            <span class="success-label">Recipient</span>
                            <span class="success-val">${toVal}</span>
                        </div>
                        <div class="success-row">
                            <span class="success-label">Delivery method</span>
                            <span class="success-val">SMS & PDF invite sent instantly</span>
                        </div>
                    `;
                }
                
                elements.takeawaySuccessModal.classList.add("active");
                
                document.getElementById("gifting-form").reset();
                updateGiftingCardPreview();
                
                elements.purchaseGiftBtn.disabled = false;
                showToast("Gift Voucher Issued", `Code ${voucherCode} confirmed.`);
            };

            if (supabase) {
                supabase.from('gift_vouchers').insert([{
                    voucher_code: voucherCode,
                    recipient: toVal,
                    sender: fromVal,
                    package_id: pkgId,
                    message: msgVal,
                    status: 'active'
                }]).then(({ error }) => {
                    if (error) console.error("Supabase gift error:", error);
                    finalizeGift();
                }).catch(err => {
                    console.error("Supabase gift query crash:", err);
                    finalizeGift();
                });
            } else {
                setTimeout(finalizeGift, 1200);
            }
        });
    }

    // --- TESTIMONIAL CAROUSEL ---
    const updateTestimonials = () => {
        elements.testimonialSlides.forEach((slide, idx) => {
            slide.classList.remove("active");
            elements.testimonialDots[idx].classList.remove("active");
            if (idx === state.activeTestimonial) {
                slide.classList.add("active");
                elements.testimonialDots[idx].classList.add("active");
            }
        });
    };

    if (elements.testimonialDots.length > 0) {
        elements.testimonialDots.forEach((dot, idx) => {
            dot.addEventListener("click", () => {
                state.activeTestimonial = idx;
                updateTestimonials();
            });
        });

        setInterval(() => {
            state.activeTestimonial = (state.activeTestimonial + 1) % elements.testimonialSlides.length;
            updateTestimonials();
        }, 6000);
    }

    // --- INITIALIZE APPLICATION ---
    initLocalStorage();
    state.displayedBookings = []; // Start empty, loaded via lookup
    updateBookingCalendar();
    renderBookingsList(state.displayedBookings);
    renderShopItems();
    updateCartUI();
    updateTestimonials();
    updateTimelineCard(0); // Load January timeline initially
});
