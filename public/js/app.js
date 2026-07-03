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
        orders: [],
        displayedOrders: [],
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
        activeTimelineMonth: 0,
        activePortalTab: "bookings"
    };

    // --- DATABASE API CONFIGURATION ---
    const useApiRoutes = true;

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${year}-${month}-${day}`;
    };

    const formatDateUS = (dateVal) => {
        if (!dateVal) return '';
        let d = dateVal;
        if (!(d instanceof Date)) {
            const cleanStr = String(dateVal).split('T')[0];
            const parts = cleanStr.split('-');
            if (parts.length === 3) {
                return `${parts[1]}/${parts[2]}/${parts[0]}`;
            }
            d = new Date(cleanStr + "T00:00:00");
        }
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${month}/${day}/${year}`;
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
    let bookingIdToCancel = null;

    // Load initial fallback bookings and orders
    const initLocalStorage = () => {
        // Bookings
        const storedBookings = localStorage.getItem("aether_bookings");
        if (storedBookings) {
            state.bookings = JSON.parse(storedBookings).map(b => {
                if (b.date) b.date = new Date(b.date);
                return b;
            });
        } else {
            state.bookings = [];
            saveBookingsToStorage();
        }

        // Takeaway Orders
        const storedOrders = localStorage.getItem("aether_orders");
        if (storedOrders) {
            state.orders = JSON.parse(storedOrders);
        } else {
            state.orders = [];
            saveOrdersToStorage();
        }
    };

    const saveBookingsToStorage = () => {
        localStorage.setItem("aether_bookings", JSON.stringify(state.bookings));
    };

    const saveOrdersToStorage = () => {
        localStorage.setItem("aether_orders", JSON.stringify(state.orders));
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
        
        // Manage Bookings & Orders
        bookingsList: document.getElementById("bookings-list"),
        ordersList: document.getElementById("orders-list"),
        manageEmpty: document.getElementById("manage-empty"),
        portalTabBookings: document.getElementById("portal-tab-bookings"),
        portalTabOrders: document.getElementById("portal-tab-orders"),
        
        // At Home Takeaway & Gifting Tabs
        homeTabTakeaway: document.getElementById("home-tab-takeaway"),
        homeTabGifting: document.getElementById("home-tab-gifting"),
        paneTakeaway: document.getElementById("pane-takeaway"),
        paneGifting: document.getElementById("pane-gifting"),
        
        // Takeaway Cart & Checkout Fields
        shopItemsList: document.getElementById("shop-items-list"),
        cartSummary: document.getElementById("cart-summary-items"),
        cartSubtotal: document.getElementById("cart-subtotal"),
        cartTotal: document.getElementById("cart-total"),
        placeOrderBtn: document.getElementById("place-order-btn"),
        takeawayName: document.getElementById("takeaway-name"),
        takeawayPhone: document.getElementById("takeaway-phone"),
        takeawayEmail: document.getElementById("takeaway-email"),
        takeawayAddress: document.getElementById("takeaway-address"),
        takeawayInstructions: document.getElementById("takeaway-instructions"),
        takeawayAddressContainer: document.getElementById("takeaway-address-container"),

        
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
        takeawayViewOrdersBtn: document.getElementById("takeaway-view-orders-btn"),
        
        // Premium Manage Reservation Modal Elements
        manageResModal: document.getElementById("modal-manage-reservation"),
        openManageModalBtn: document.getElementById("open-manage-modal-btn"),
        manageVerifyBtn: document.getElementById("manage-verify-btn"),
        manageVerifyRefState: document.getElementById("manage-verify-ref"),
        manageVerifyPhoneState: document.getElementById("manage-verify-phone"),
        manageResVerifyState: document.getElementById("manage-res-verify-state"),
        manageResLoadingState: document.getElementById("manage-res-loading-state"),
        manageResDetailsState: document.getElementById("manage-res-details-state"),
        manageResErrorState: document.getElementById("manage-res-error-state"),
        manageRefIdInput: document.getElementById("manage-ref-id"),
        manageRefEmailInput: document.getElementById("manage-ref-email"),
        managePhoneNumInput: document.getElementById("manage-phone-num"),
        managePhoneDateInput: document.getElementById("manage-phone-date"),
        errManageVerify: document.getElementById("err-manage-verify"),
        
        // Details elements
        manageDetName: document.getElementById("manage-det-name"),
        manageDetDate: document.getElementById("manage-det-date"),
        manageDetTime: document.getElementById("manage-det-time"),
        manageDetGuests: document.getElementById("manage-det-guests"),
        manageDetSeating: document.getElementById("manage-det-seating"),
        manageDetRequests: document.getElementById("manage-det-requests"),
        manageResConfId: document.getElementById("manage-res-conf-id"),
        manageResStatusBadge: document.getElementById("manage-res-status-badge"),
        
        // Details action buttons
        manageRescheduleBtn: document.getElementById("manage-reschedule-btn"),
        manageEditRequestsBtn: document.getElementById("manage-edit-requests-btn"),
        manageCancelResBtn: document.getElementById("manage-cancel-res-btn"),
        
        // Edit special requests elements
        manageResEditRequests: document.getElementById("manage-res-edit-requests"),
        manageEditRequestsInput: document.getElementById("manage-edit-requests-input"),
        manageCancelEditBtn: document.getElementById("manage-cancel-edit-btn"),
        manageSaveRequestsBtn: document.getElementById("manage-save-requests-btn"),
        manageResActions: document.getElementById("manage-res-actions"),
        manageResTryAgainBtn: document.getElementById("manage-res-try-again"),

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
        try {
            const res = await fetch('/api/bookings');
            if (!res.ok) throw new Error("Failed to fetch bookings");
            const data = await res.json();
            
            const year = monthState.getFullYear();
            const month = monthState.getMonth();
            
            data.forEach(b => {
                const bDate = new Date(b.date + "T00:00:00");
                if (bDate.getFullYear() === year && bDate.getMonth() === month && b.status !== 'cancelled') {
                    const dateStr = bDate.toDateString();
                    monthAvailabilityMap[dateStr] = (monthAvailabilityMap[dateStr] || 0) + 1;
                }
            });
        } catch (e) {
            console.error("Error loading month availability:", e);
        }
    };

    const loadDayReservations = async (date) => {
        dayReservations = [];
        try {
            const res = await fetch('/api/bookings');
            if (!res.ok) throw new Error("Failed to fetch bookings");
            const data = await res.json();
            const dateStr = formatDate(date);
            dayReservations = data.filter(b => b.date === dateStr && b.status !== 'cancelled').map(b => ({
                time: b.time,
                seat_type: b.seatType,
                guests: b.guests
            }));
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
            const cleanPhone = phone.replace(/\D/g, '');
            if (!phone) {
                document.getElementById("err-phone").textContent = "Contact number is required";
                hasErrors = true;
            } else if (cleanPhone.length !== 10) {
                document.getElementById("err-phone").textContent = "US phone number is required (10 digits, e.g., 212-555-0198)";
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

            fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: newBooking.id,
                    name: newBooking.name,
                    phone: newBooking.phone,
                    email: newBooking.email.toLowerCase(),
                    date: formatDate(newBooking.date),
                    time: newBooking.time,
                    guests: newBooking.guests,
                    seatType: newBooking.seatType,
                    upgrades: newBooking.upgrades,
                    occasion: newBooking.occasion,
                    dietary: newBooking.dietary
                })
            })
            .then(res => {
                if (!res.ok) throw new Error("Failed to insert booking");
                return res.json();
            })
            .then(() => {
                finalizeBooking();
            })
            .catch(err => {
                console.error("Booking API error:", err);
                finalizeBooking();
            });
        });
    }

    // Cancel button in booking form
    const cancelFormBtn = document.getElementById("cancel-booking-form-btn");
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener("click", () => {
            elements.bookingForm.reset();
            state.selectedDate = null;
            state.selectedTimeSlot = null;
            state.selectedSeatType = null;
            state.selectedUpgrades = [];
            
            if (elements.timeSlotsWrapper) elements.timeSlotsWrapper.style.display = "none";
            if (elements.floorplanWrapper) elements.floorplanWrapper.style.display = "none";
            elements.seatNodes.forEach(n => n.classList.remove("selected"));
            elements.upgradeCards.forEach(c => {
                c.classList.remove("active");
                c.querySelector(".upgrade-checkbox").textContent = "";
            });
            if (elements.depositBreakdown) elements.depositBreakdown.innerHTML = "";
            
            updateBookingCalendar();
            
            // Scroll back to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showToast("Booking Form Reset", "Seating selection has been cleared.");
        });
    }

    const showSuccessModal = (booking) => {
        document.getElementById("success-conf").textContent = booking.id;
        document.getElementById("success-name").textContent = booking.name;
        document.getElementById("success-guests").textContent = `${booking.guests} guest${booking.guests > 1 ? 's' : ''}`;
        
        const dateStr = formatDateUS(booking.date);
        document.getElementById("success-date").textContent = dateStr;
        document.getElementById("success-time").textContent = booking.time;
        
        const areaDetails = window.AetherData.seatingLocations[booking.seatType];
        document.getElementById("success-seating").textContent = areaDetails ? areaDetails.name : "Main dining";
        
        const successRescheduleBtn = document.getElementById("success-reschedule-btn");
        if (successRescheduleBtn) {
            const newReschedBtn = successRescheduleBtn.cloneNode(true);
            successRescheduleBtn.parentNode.replaceChild(newReschedBtn, successRescheduleBtn);
            newReschedBtn.addEventListener("click", () => {
                elements.bookingSuccessModal.classList.remove("active");
                openRescheduleModal(booking.id);
            });
        }

        const successCancelBtn = document.getElementById("success-cancel-btn");
        if (successCancelBtn) {
            const newCancelBtn = successCancelBtn.cloneNode(true);
            successCancelBtn.parentNode.replaceChild(newCancelBtn, successCancelBtn);
            newCancelBtn.addEventListener("click", () => {
                elements.bookingSuccessModal.classList.remove("active");
                bookingIdToCancel = booking.id;
                elements.cancelModal.classList.add("active");
            });
        }
        
        elements.bookingSuccessModal.classList.add("active");
    };

    // Close success modals
    document.querySelectorAll(".modal-close, .modal-dismiss").forEach(btn => {
        btn.addEventListener("click", () => {
            if (elements.bookingSuccessModal) elements.bookingSuccessModal.classList.remove("active");
            if (elements.rescheduleModal) elements.rescheduleModal.classList.remove("active");
            if (elements.cancelModal) elements.cancelModal.classList.remove("active");
            if (elements.takeawaySuccessModal) elements.takeawaySuccessModal.classList.remove("active");
            if (elements.manageResModal) elements.manageResModal.classList.remove("active");
        });
    });

    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                overlay.classList.remove("active");
            }
        });
    });

    // --- RESERVATION MANAGEMENT (CRUD & PREMIUM CONCIERGE) ---
    let activeVerifyMethod = "ref"; // Default verification method

    // Toggle verification methods
    const verifyMethodBtns = document.querySelectorAll(".manage-verify-method-btn");
    verifyMethodBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            verifyMethodBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const method = btn.getAttribute("data-method");
            activeVerifyMethod = method;
            
            if (method === "ref") {
                if (elements.manageVerifyRefState) elements.manageVerifyRefState.style.display = "flex";
                if (elements.manageVerifyPhoneState) elements.manageVerifyPhoneState.style.display = "none";
            } else {
                if (elements.manageVerifyRefState) elements.manageVerifyRefState.style.display = "none";
                if (elements.manageVerifyPhoneState) elements.manageVerifyPhoneState.style.display = "flex";
            }
        });
    });

    // Open manage reservation modal
    if (elements.openManageModalBtn) {
        elements.openManageModalBtn.addEventListener("click", () => {
            // Reset verification modal states
            if (elements.manageResVerifyState) elements.manageResVerifyState.style.display = "block";
            if (elements.manageResLoadingState) elements.manageResLoadingState.style.display = "none";
            if (elements.manageResDetailsState) elements.manageResDetailsState.style.display = "none";
            if (elements.manageResErrorState) elements.manageResErrorState.style.display = "none";
            if (elements.manageResEditRequests) elements.manageResEditRequests.style.display = "none";
            if (elements.manageResActions) elements.manageResActions.style.display = "flex";
            if (elements.errManageVerify) elements.errManageVerify.textContent = "";

            // Clear inputs
            if (elements.manageRefIdInput) elements.manageRefIdInput.value = "";
            if (elements.manageRefEmailInput) elements.manageRefEmailInput.value = "";
            if (elements.managePhoneNumInput) elements.managePhoneNumInput.value = "";
            if (elements.managePhoneDateInput) elements.managePhoneDateInput.value = "";

            // Reset toggle
            verifyMethodBtns.forEach(b => b.classList.remove("active"));
            const defaultToggle = document.querySelector('.manage-verify-method-btn[data-method="ref"]');
            if (defaultToggle) defaultToggle.classList.add("active");
            activeVerifyMethod = "ref";
            if (elements.manageVerifyRefState) elements.manageVerifyRefState.style.display = "flex";
            if (elements.manageVerifyPhoneState) elements.manageVerifyPhoneState.style.display = "none";

            // Open modal
            if (elements.manageResModal) elements.manageResModal.classList.add("active");
        });
    }

    // Try again button
    if (elements.manageResTryAgainBtn) {
        elements.manageResTryAgainBtn.addEventListener("click", () => {
            if (elements.manageResErrorState) elements.manageResErrorState.style.display = "none";
            if (elements.manageResVerifyState) elements.manageResVerifyState.style.display = "block";
            if (elements.errManageVerify) elements.errManageVerify.textContent = "";
        });
    }

    // Find My Reservation
    if (elements.manageVerifyBtn) {
        elements.manageVerifyBtn.addEventListener("click", async () => {
            if (elements.errManageVerify) elements.errManageVerify.textContent = "";

            let foundBooking = null;

            if (activeVerifyMethod === "ref") {
                const refId = elements.manageRefIdInput ? elements.manageRefIdInput.value.trim().toUpperCase() : "";
                const email = elements.manageRefEmailInput ? elements.manageRefEmailInput.value.trim().toLowerCase() : "";

                if (!refId || !email) {
                    if (elements.errManageVerify) elements.errManageVerify.textContent = "Please fill in all booking reference fields.";
                    return;
                }

                // Show loading
                if (elements.manageResVerifyState) elements.manageResVerifyState.style.display = "none";
                if (elements.manageResLoadingState) elements.manageResLoadingState.style.display = "block";

                // Fetch from our API
                try {
                    const res = await fetch(`/api/bookings?id=${encodeURIComponent(refId)}&email=${encodeURIComponent(email)}`);
                    if (res.ok) {
                        const b = await res.json();
                        foundBooking = {
                            id: b.id,
                            name: b.name,
                            phone: b.phone,
                            email: b.email,
                            date: new Date(b.date + "T00:00:00"),
                            time: b.time,
                            guests: b.guests,
                            seatType: b.seatType,
                            upgrades: b.upgrades || [],
                            occasion: b.occasion,
                            dietary: b.dietary,
                            status: b.status
                        };
                        // sync to local state
                        if (!state.bookings.some(x => x.id.toUpperCase() === foundBooking.id.toUpperCase())) {
                            state.bookings.push(foundBooking);
                            saveBookingsToStorage();
                        }
                    }
                } catch (e) {
                    console.error("API lookup error:", e);
                }

                // Fallback to local storage
                if (!foundBooking) {
                    const localB = state.bookings.find(
                        x => x.id.toUpperCase() === refId && x.email.toLowerCase() === email
                    );
                    if (localB) {
                        foundBooking = {
                            ...localB,
                            date: localB.date instanceof Date ? localB.date : new Date(String(localB.date).split('T')[0] + "T00:00:00")
                        };
                    }
                }
            } else {
                const phone = elements.managePhoneNumInput ? elements.managePhoneNumInput.value.trim() : "";
                const dateVal = elements.managePhoneDateInput ? elements.managePhoneDateInput.value.trim() : "";

                if (!phone || !dateVal) {
                    if (elements.errManageVerify) elements.errManageVerify.textContent = "Please enter both phone number and date.";
                    return;
                }

                // Show loading
                if (elements.manageResVerifyState) elements.manageResVerifyState.style.display = "none";
                if (elements.manageResLoadingState) elements.manageResLoadingState.style.display = "block";

                const cleanPhone = phone.replace(/\D/g, '');

                try {
                    const res = await fetch('/api/bookings');
                    if (res.ok) {
                        const bookingsList = await res.json();
                        const b = bookingsList.find(x => {
                            const cleanBookingPhone = x.phone.replace(/\D/g, '');
                            return cleanBookingPhone === cleanPhone && x.date === dateVal && x.status !== 'cancelled';
                        });
                        if (b) {
                            foundBooking = {
                                id: b.id,
                                name: b.name,
                                phone: b.phone,
                                email: b.email,
                                date: new Date(b.date + "T00:00:00"),
                                time: b.time,
                                guests: b.guests,
                                seatType: b.seatType,
                                upgrades: b.upgrades || [],
                                occasion: b.occasion,
                                dietary: b.dietary,
                                status: b.status
                            };
                            // sync to local state
                            if (!state.bookings.some(x => x.id.toUpperCase() === foundBooking.id.toUpperCase())) {
                                state.bookings.push(foundBooking);
                                saveBookingsToStorage();
                            }
                        }
                    }
                } catch (e) {
                    console.error("API phone lookup error:", e);
                }

                // Fallback to local storage
                if (!foundBooking) {
                    const localB = state.bookings.find(x => {
                        const cleanBookingPhone = x.phone.replace(/\D/g, '');
                        const formattedBookingDate = x.date instanceof Date 
                            ? x.date.toISOString().split('T')[0] 
                            : String(x.date).split('T')[0];
                        return cleanBookingPhone === cleanPhone && formattedBookingDate === dateVal && x.status !== 'cancelled';
                    });
                    if (localB) {
                        foundBooking = {
                            ...localB,
                            date: localB.date instanceof Date ? localB.date : new Date(String(localB.date).split('T')[0] + "T00:00:00")
                        };
                    }
                }
            }

            if (elements.manageResLoadingState) elements.manageResLoadingState.style.display = "none";

            if (foundBooking) {
                state.activeManagedReservation = foundBooking;

                // Populate UI details
                if (elements.manageDetName) elements.manageDetName.textContent = foundBooking.name;
                
                const formattedDate = formatDateUS(foundBooking.date);
                if (elements.manageDetDate) elements.manageDetDate.textContent = formattedDate;
                if (elements.manageDetTime) elements.manageDetTime.textContent = foundBooking.time;
                if (elements.manageDetGuests) elements.manageDetGuests.textContent = foundBooking.guests;
                
                const locDetails = window.AetherData.seatingLocations[foundBooking.seatType];
                if (elements.manageDetSeating) {
                    elements.manageDetSeating.textContent = locDetails ? locDetails.name : foundBooking.seatType;
                }
                if (elements.manageDetRequests) {
                    elements.manageDetRequests.textContent = foundBooking.dietary || "None";
                }
                if (elements.manageResConfId) elements.manageResConfId.textContent = foundBooking.id;
                
                if (elements.manageResStatusBadge) {
                    elements.manageResStatusBadge.textContent = foundBooking.status || "Confirmed";
                    elements.manageResStatusBadge.style.borderColor = foundBooking.status === "cancelled" ? "var(--color-danger)" : "var(--color-success)";
                    elements.manageResStatusBadge.style.color = foundBooking.status === "cancelled" ? "var(--color-danger)" : "var(--color-success)";
                }

                // Show Details
                if (elements.manageResDetailsState) elements.manageResDetailsState.style.display = "block";
            } else {
                // Show Error State
                if (elements.manageResErrorState) elements.manageResErrorState.style.display = "block";
            }
        });
    }

    // Details actions: Edit requests toggle
    if (elements.manageEditRequestsBtn) {
        elements.manageEditRequestsBtn.addEventListener("click", () => {
            if (!state.activeManagedReservation) return;
            
            if (elements.manageResActions) elements.manageResActions.style.display = "none";
            if (elements.manageEditRequestsInput) {
                elements.manageEditRequestsInput.value = state.activeManagedReservation.dietary || "";
            }
            if (elements.manageResEditRequests) elements.manageResEditRequests.style.display = "block";
        });
    }

    // Cancel edit requests
    if (elements.manageCancelEditBtn) {
        elements.manageCancelEditBtn.addEventListener("click", () => {
            if (elements.manageResEditRequests) elements.manageResEditRequests.style.display = "none";
            if (elements.manageResActions) elements.manageResActions.style.display = "flex";
        });
    }

    // Save edit requests
    if (elements.manageSaveRequestsBtn) {
        elements.manageSaveRequestsBtn.addEventListener("click", async () => {
            const booking = state.activeManagedReservation;
            if (!booking) return;

            const updatedRequests = elements.manageEditRequestsInput ? elements.manageEditRequestsInput.value.trim() : "";
            
            elements.manageSaveRequestsBtn.textContent = "Saving...";
            elements.manageSaveRequestsBtn.disabled = true;

            const finalizeSave = () => {
                booking.dietary = updatedRequests;
                
                // Sync to local arrays
                const localBooking = state.bookings.find(b => b.id === booking.id);
                if (localBooking) {
                    localBooking.dietary = updatedRequests;
                    saveBookingsToStorage();
                }

                if (elements.manageDetRequests) {
                    elements.manageDetRequests.textContent = updatedRequests || "None";
                }

                if (elements.manageResEditRequests) elements.manageResEditRequests.style.display = "none";
                if (elements.manageResActions) elements.manageResActions.style.display = "flex";
                
                elements.manageSaveRequestsBtn.textContent = "Save Changes";
                elements.manageSaveRequestsBtn.disabled = false;
                
                showToast("Requests Updated", "Your special requests have been successfully updated.");
            };

            try {
                const res = await fetch(`/api/bookings/${booking.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notes: booking.notes, dietary: updatedRequests })
                });
                if (!res.ok) throw new Error("Failed to save requests");
                finalizeSave();
            } catch (err) {
                console.error("API update requests error:", err);
                finalizeSave();
            }
        });
    }

    // Details actions: Reschedule
    if (elements.manageRescheduleBtn) {
        elements.manageRescheduleBtn.addEventListener("click", () => {
            const booking = state.activeManagedReservation;
            if (!booking) return;

            // Close verification modal
            if (elements.manageResModal) elements.manageResModal.classList.remove("active");

            // Open reschedule flow
            openRescheduleModal(booking.id);
        });
    }

    // Details actions: Cancel Reservation
    if (elements.manageCancelResBtn) {
        elements.manageCancelResBtn.addEventListener("click", () => {
            const booking = state.activeManagedReservation;
            if (!booking) return;

            // Close verification modal
            if (elements.manageResModal) elements.manageResModal.classList.remove("active");

            // Set global ID for cancellation confirm
            bookingIdToCancel = booking.id;

            // Open confirm modal
            if (elements.cancelModal) elements.cancelModal.classList.add("active");
        });
    }

    // Keep render lists safe but dummy
    const renderBookingsList = (bookingsToRender) => {
        if (!elements.bookingsList) return;
        elements.bookingsList.innerHTML = "";
    };
    const renderOrdersList = (ordersToRender) => {
        if (!elements.ordersList) return;
        elements.ordersList.innerHTML = "";
    };

    // Cancellation flow confirm
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

                if (state.activeManagedReservation && state.activeManagedReservation.id === id) {
                    state.activeManagedReservation = null;
                }
                
                elements.cancelModal.classList.remove("active");
                showToast("Reservation Cancelled", "Your table has been released. A cancellation confirmation has been sent to your email and calendar.");
                bookingIdToCancel = null;
                
                renderBookingsList(state.displayedBookings);
                updateBookingCalendar();
            };
            
            confirmCancelBtn.textContent = "Cancelling...";
            confirmCancelBtn.disabled = true;
            
            fetch(`/api/bookings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel', reason: 'Guest cancelled reservation' })
            })
            .then(res => {
                if (!res.ok) throw new Error("Failed to cancel booking");
                return res.json();
            })
            .then(() => {
                finalizeCancel();
            })
            .catch(err => {
                console.error("API cancel error:", err);
                finalizeCancel();
            })
            .finally(() => {
                confirmCancelBtn.textContent = "Confirm Cancellation";
                confirmCancelBtn.disabled = false;
            });
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

                if (state.activeManagedReservation && state.activeManagedReservation.id === id) {
                    state.activeManagedReservation.date = state.rescheduleSelectedDate;
                    state.activeManagedReservation.time = state.rescheduleSelectedTime;
                    state.activeManagedReservation.guests = guests;
                }
                
                elements.rescheduleModal.classList.remove("active");
                showToast("Reservation Updated", "An updated confirmation email and calendar event invite have been dispatched.");
                
                state.reschedulingBookingId = null;
                state.rescheduleSelectedDate = null;
                state.rescheduleSelectedTime = null;
                
                renderBookingsList(state.displayedBookings);
                updateBookingCalendar();
            };
            
            submitRescheduleBtn.textContent = "Updating...";
            submitRescheduleBtn.disabled = true;
            
            fetch(`/api/bookings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reschedule',
                    date: formatDate(state.rescheduleSelectedDate),
                    time: state.rescheduleSelectedTime,
                    guests: guests,
                    reason: 'Guest rescheduled reservation'
                })
            })
            .then(res => {
                if (!res.ok) throw new Error("Failed to reschedule");
                return res.json();
            })
            .then(() => {
                finalizeReschedule();
            })
            .catch(err => {
                console.error("API reschedule error:", err);
                finalizeReschedule();
            })
            .finally(() => {
                submitRescheduleBtn.textContent = "Update Reservation";
                submitRescheduleBtn.disabled = false;
            });
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
        
        const takeawayType = document.querySelector('input[name="takeaway-type"]:checked')?.value || "delivery";
        const deliveryFee = takeawayType === "delivery" ? 15 : 0;
        
        if (elements.cartDeliveryFee) {
            elements.cartDeliveryFee.textContent = `$${deliveryFee}`;
        }
        const deliveryFeeLabel = document.getElementById("cart-delivery-fee");
        if (deliveryFeeLabel) {
            deliveryFeeLabel.textContent = deliveryFee > 0 ? `$${deliveryFee}` : "Free";
        }
        
        if (subtotal === 0) {
            elements.cartSummary.innerHTML = `<div style="font-size:0.75rem; color:var(--color-secondary); text-align:center;">Cart is empty. Select items.</div>`;
            elements.placeOrderBtn.disabled = true;
            elements.cartSubtotal.textContent = "$0";
            elements.cartTotal.textContent = "$0";
            return;
        }
        
        elements.placeOrderBtn.disabled = false;
        elements.cartSubtotal.textContent = `$${subtotal}`;
        
        const total = subtotal + deliveryFee;
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
    };    // Delivery / Pickup Toggle Listener
    const takeawayTypeRadios = document.querySelectorAll('input[name="takeaway-type"]');
    takeawayTypeRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            const val = e.target.value;
            document.querySelectorAll(".segment-btn").forEach(lbl => {
                if (lbl.getAttribute("for") === `type-${val}`) {
                    lbl.classList.add("active");
                } else {
                    lbl.classList.remove("active");
                }
            });
            
            if (val === "pickup") {
                if (elements.takeawayAddressContainer) {
                    elements.takeawayAddressContainer.style.display = "none";
                }
                const addressInput = document.getElementById("takeaway-address");
                if (addressInput) addressInput.required = false;
                
                const deliveryRow = document.getElementById("cart-delivery-row");
                if (deliveryRow) deliveryRow.style.display = "none";
                
                if (elements.takeawayNote) {
                    elements.takeawayNote.textContent = "Pickup from our Manhattan location. Ready for pickup next-day after 1:00 PM.";
                }
            } else {
                if (elements.takeawayAddressContainer) {
                    elements.takeawayAddressContainer.style.display = "block";
                }
                const addressInput = document.getElementById("takeaway-address");
                if (addressInput) addressInput.required = true;
                
                const deliveryRow = document.getElementById("cart-delivery-row");
                if (deliveryRow) deliveryRow.style.display = "flex";
                
                if (elements.takeawayNote) {
                    elements.takeawayNote.textContent = "Delivery restricted to Manhattan below 96th Street. Courier scheduled for next-day dispatch.";
                }
            }
            updateCartUI();
        });
    });

    if (elements.placeOrderBtn) {
        elements.placeOrderBtn.addEventListener("click", () => {
            // Validation
            let isValid = true;
            
            const name = elements.takeawayName ? elements.takeawayName.value.trim() : "";
            const phone = elements.takeawayPhone ? elements.takeawayPhone.value.trim() : "";
            const email = elements.takeawayEmail ? elements.takeawayEmail.value.trim() : "";
            const instructions = elements.takeawayInstructions ? elements.takeawayInstructions.value.trim() : "";
            
            // Clear errors
            document.getElementById("err-takeaway-name").textContent = "";
            document.getElementById("err-takeaway-phone").textContent = "";
            document.getElementById("err-takeaway-email").textContent = "";
            document.getElementById("err-takeaway-address").textContent = "";
            
            if (!name) {
                document.getElementById("err-takeaway-name").textContent = "Full Name is required";
                isValid = false;
            }
            const cleanPhone = phone.replace(/\D/g, '');
            if (!phone) {
                document.getElementById("err-takeaway-phone").textContent = "Phone Number is required";
                isValid = false;
            } else if (cleanPhone.length !== 10) {
                document.getElementById("err-takeaway-phone").textContent = "US phone number is required (10 digits)";
                isValid = false;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email) {
                document.getElementById("err-takeaway-email").textContent = "Email Address is required";
                isValid = false;
            } else if (!emailRegex.test(email)) {
                document.getElementById("err-takeaway-email").textContent = "Invalid email format";
                isValid = false;
            }
            
            const typeSelected = document.querySelector('input[name="takeaway-type"]:checked')?.value || "delivery";
            let address = "";
            if (typeSelected === "delivery") {
                address = elements.takeawayAddress ? elements.takeawayAddress.value.trim() : "";
                if (!address) {
                    document.getElementById("err-takeaway-address").textContent = "Delivery Address is required";
                    isValid = false;
                }
            }
            
            if (!isValid) {
                showToast("Order Validation", "Please fill in all required checkout fields.");
                return;
            }
            
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
            const deliveryFee = typeSelected === "delivery" ? 15 : 0;
            const total = subtotal + deliveryFee;
            
            const newOrder = {
                id: orderNum,
                name: name,
                phone: phone,
                email: email,
                type: typeSelected,
                address: address,
                items: cartItems,
                subtotal: subtotal,
                total: total,
                instructions: instructions,
                createdAt: new Date().toISOString()
            };

            const finalizeOrder = () => {
                // Add order to state & localstorage
                state.orders.push(newOrder);
                saveOrdersToStorage();
                
                // Update success modal
                document.getElementById("takeaway-order-num").textContent = orderNum;
                document.getElementById("takeaway-order-type").textContent = typeSelected === "delivery" ? "Courier Delivery" : "Self Pickup";
                document.getElementById("takeaway-order-time").textContent = typeSelected === "delivery" ? "Tomorrow, between 1:00 PM – 4:00 PM" : "Tomorrow, ready after 1:00 PM";
                
                // Compile items summary for modal
                const itemsSummaryStr = Object.keys(cartItems).map(name => `${cartItems[name]}x ${name}`).join("<br>");
                document.getElementById("takeaway-order-items").innerHTML = itemsSummaryStr;
                document.getElementById("takeaway-order-total").textContent = `$${total}`;
                
                elements.takeawaySuccessModal.classList.add("active");
                state.cart = {};
                
                // Clear input fields
                if (elements.takeawayName) elements.takeawayName.value = "";
                if (elements.takeawayPhone) elements.takeawayPhone.value = "";
                if (elements.takeawayEmail) elements.takeawayEmail.value = "";
                if (elements.takeawayAddress) elements.takeawayAddress.value = "";
                if (elements.takeawayInstructions) elements.takeawayInstructions.value = "";
                
                renderShopItems();
                updateCartUI();
                
                elements.placeOrderBtn.textContent = "Place Takeaway Order";
                elements.placeOrderBtn.disabled = false;
                
                showToast("Order Placed", `Confirmation receipt ${orderNum} sent.`);
            };

            fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: orderNum,
                    name: name,
                    phone: phone,
                    email: email,
                    type: typeSelected,
                    address: address,
                    items: cartItems,
                    subtotal: subtotal,
                    total: total,
                    instructions: instructions
                })
            })
            .then(res => {
                if (!res.ok) throw new Error("Failed to place order");
                return res.json();
            })
            .then(() => {
                finalizeOrder();
            })
            .catch(err => {
                console.error("API order placement error:", err);
                finalizeOrder();
            });
        });
    }

    // View My Orders click listener from order success modal
    if (elements.takeawayViewOrdersBtn) {
        elements.takeawayViewOrdersBtn.addEventListener("click", () => {
            elements.takeawaySuccessModal.classList.remove("active");
            
            // Switch tab to orders
            switchPortalTab("orders");
            
            // Scroll down
            const manageSection = document.getElementById("manage-bookings-section");
            if (manageSection) {
                manageSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Pre-fill lookup and execute search
            if (state.orders && state.orders.length > 0) {
                const latestOrder = state.orders[state.orders.length - 1];
                lookupEmailInput.value = latestOrder.email;
                setTimeout(() => lookupBtn.click(), 500);
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

            fetch('/api/vouchers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voucher_code: voucherCode,
                    recipient: toVal,
                    sender: fromVal,
                    package_id: pkgId,
                    message: msgVal
                })
            })
            .then(res => {
                if (!res.ok) throw new Error("Failed to purchase voucher");
                return res.json();
            })
            .then(() => {
                finalizeGift();
            })
            .catch(err => {
                console.error("API voucher purchase error:", err);
                finalizeGift();
            });
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
