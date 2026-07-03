/**
 * Aether NYC - Maitre D' Desk Dashboard Controller
 * 
 * Manages reactive admin state, fetches from API routes, drives interactive SVG floor plans,
 * filters databases, handles booking CRUD modally, and updates audit logs.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- STATE MANAGEMENT ---
    let state = {
        bookings: [],
        orders: [],
        vouchers: [],
        auditLog: [],
        selectedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        activeTab: "panel-overview",
        currentEditBookingId: null,
        dbOnline: true
    };

    // --- DOM ELEMENT CACHE ---
    const elements = {
        sidebarItems: document.querySelectorAll(".sidebar-item"),
        panels: document.querySelectorAll(".admin-panel"),
        panelTitle: document.getElementById("active-panel-title"),
        panelSubtitle: document.getElementById("active-panel-subtitle"),
        statusDot: document.getElementById("status-dot"),
        statusText: document.getElementById("status-text"),
        
        // Metrics Summary Cards
        statBookingsToday: document.getElementById("stat-bookings-today"),
        statBookingsTomorrow: document.getElementById("stat-bookings-tomorrow"),
        statCoversToday: document.getElementById("stat-covers-today"),
        statOrdersPending: document.getElementById("stat-orders-pending"),
        statOrdersRevenue: document.getElementById("stat-orders-revenue"),
        statVouchersActive: document.getElementById("stat-vouchers-active"),

        // Overview / Floorplan elements
        overviewDatePicker: document.getElementById("overview-date-picker"),
        coversCounter: document.getElementById("covers-counter"),
        coversBanquette: document.getElementById("covers-banquette"),
        coversAlcove: document.getElementById("covers-alcove"),
        fillCounter: document.getElementById("fill-counter"),
        fillBanquette: document.getElementById("fill-banquette"),
        fillAlcove: document.getElementById("fill-alcove"),
        activityStreamList: document.getElementById("activity-stream-list"),

        // SVG Seating Groups
        svgCounterChairs: document.querySelectorAll("#floor-counter circle"),
        svgBanquetteTables: document.querySelectorAll("#floor-banquette rect"),
        svgBanquetteChairs: document.querySelectorAll("#floor-banquette circle"),
        svgAlcoveTables: document.querySelectorAll("#floor-alcove circle[r='9']"),
        svgAlcoveChairs: document.querySelectorAll("#floor-alcove circle[r='3.5']"),

        // Bookings Panel Controls & Table
        bookingsSearch: document.getElementById("bookings-search"),
        bookingsFilterDate: document.getElementById("bookings-filter-date"),
        bookingsFilterZone: document.getElementById("bookings-filter-zone"),
        bookingsFilterStatus: document.getElementById("bookings-filter-status"),
        bookingsTableBody: document.getElementById("bookings-table-body"),
        btnOpenCreateBooking: document.getElementById("btn-open-create-booking"),

        // Orders Panel Controls & Table
        ordersSearch: document.getElementById("orders-search"),
        ordersFilterType: document.getElementById("orders-filter-type"),
        ordersFilterStatus: document.getElementById("orders-filter-status"),
        ordersTableBody: document.getElementById("orders-table-body"),

        // Vouchers Panel Table
        vouchersTableBody: document.getElementById("vouchers-table-body"),
        btnOpenCreateVoucher: document.getElementById("btn-open-create-voucher"),

        // Audit Trail list
        auditTrailList: document.getElementById("audit-trail-list"),

        // Modals
        modalCreateBooking: document.getElementById("modal-create-booking"),
        modalRescheduleBooking: document.getElementById("modal-reschedule-booking"),
        modalCancelBooking: document.getElementById("modal-cancel-booking"),
        modalEditNotes: document.getElementById("modal-edit-notes"),
        modalCreateVoucher: document.getElementById("modal-create-voucher"),

        // Close Buttons
        btnCloseCreateBooking: document.getElementById("btn-close-create-booking"),
        btnCancelCreateBooking: document.getElementById("btn-cancel-create-booking"),
        btnCloseReschedule: document.getElementById("btn-close-reschedule"),
        btnCancelReschedule: document.getElementById("btn-cancel-reschedule"),
        btnCloseCancel: document.getElementById("btn-close-cancel"),
        btnDismissCancel: document.getElementById("btn-dismiss-cancel"),
        btnCloseNotes: document.getElementById("btn-close-notes"),
        btnCancelNotes: document.getElementById("btn-cancel-notes"),
        btnCloseCreateVoucher: document.getElementById("btn-close-create-voucher"),
        btnCancelCreateVoucher: document.getElementById("btn-cancel-create-voucher"),

        // Forms
        createBookingForm: document.getElementById("create-booking-form"),
        rescheduleBookingForm: document.getElementById("reschedule-booking-form"),
        cancelBookingForm: document.getElementById("cancel-booking-form"),
        editNotesForm: document.getElementById("edit-notes-form"),
        createVoucherForm: document.getElementById("create-voucher-form")
    };

    // --- INITIAL DATE SETUP ---
    if (elements.overviewDatePicker) {
        elements.overviewDatePicker.value = state.selectedDate;
    }

    // --- TABS (SIDEBAR) CONTROLLER ---
    const switchTab = (targetPanelId) => {
        elements.panels.forEach(p => p.classList.remove("active"));
        elements.sidebarItems.forEach(item => item.classList.remove("active"));

        const targetPanel = document.getElementById(targetPanelId);
        if (targetPanel) {
            targetPanel.classList.add("active");
            state.activeTab = targetPanelId;
        }

        const sidebarItem = Array.from(elements.sidebarItems).find(item => item.getAttribute("data-target") === targetPanelId);
        if (sidebarItem) {
            sidebarItem.classList.add("active");
        }

        // Update Title & Subtitle based on active tab
        switch (targetPanelId) {
            case "panel-overview":
                elements.panelTitle.textContent = "Maitre D' Desk";
                elements.panelSubtitle.textContent = "Welcome back. The dining room opens at 5:30 PM.";
                renderOverviewCharts();
                break;
            case "panel-bookings":
                elements.panelTitle.textContent = "Reservations Ledger";
                elements.panelSubtitle.textContent = "View, confirm, reschedule, and manually record table bookings.";
                renderBookingsTable();
                break;
            case "panel-orders":
                elements.panelTitle.textContent = "Culinary Orders Queue";
                elements.panelSubtitle.textContent = "Manage takeaway boxes, delivery instructions, and kitchen fulfillment.";
                renderOrdersTable();
                break;
            case "panel-vouchers":
                elements.panelTitle.textContent = "Gift Vouchers Vault";
                elements.panelSubtitle.textContent = "Review outstanding dining experience codes or issue custom gift cards.";
                renderVouchersTable();
                break;
            case "panel-audit":
                elements.panelTitle.textContent = "Reservation Change Logs";
                elements.panelSubtitle.textContent = "Historical audit trail of reschedules, cancellations, and staff actions.";
                renderAuditTrail();
                break;
        }
    };

    elements.sidebarItems.forEach(item => {
        item.addEventListener("click", () => {
            const target = item.getAttribute("data-target");
            switchTab(target);
        });
    });

    // --- TOAST NOTIFICATIONS ---
    const showToast = (title, message, isError = false) => {
        const toast = document.createElement("div");
        toast.className = "toast";
        if (isError) {
            toast.style.borderLeft = "2px solid var(--color-danger)";
        }
        toast.innerHTML = `
            <div class="toast-body">
                <span class="toast-title" style="color: ${isError ? 'var(--color-danger)' : 'var(--color-gold)'}">${title}</span>
                <span class="toast-msg">${message}</span>
            </div>
            <button class="toast-close" aria-label="Close Toast Alert">&times;</button>
        `;
        
        const container = document.getElementById("toast-container");
        if (container) {
            container.appendChild(toast);
            setTimeout(() => toast.classList.add("active"), 10);
            
            const removeToast = () => {
                toast.classList.remove("active");
                setTimeout(() => toast.remove(), 400);
            };
            
            toast.querySelector(".toast-close").addEventListener("click", removeToast);
            setTimeout(removeToast, 4000);
        }
    };

    // --- DATA FETCHER ---
    const loadAllData = async () => {
        try {
            // Load Bookings
            const resBookings = await fetch('/api/bookings');
            if (resBookings.ok) {
                state.bookings = await resBookings.json();
            } else {
                state.bookings = [];
            }

            // Sync guest-facing browser bookings
            const storedBookings = localStorage.getItem("aether_bookings");
            if (storedBookings) {
                const localBookings = JSON.parse(storedBookings);
                localBookings.forEach(localB => {
                    const exists = state.bookings.some(b => b.id.toUpperCase() === localB.id.toUpperCase());
                    if (!exists) {
                        state.bookings.push({
                            ...localB,
                            date: localB.date instanceof Date ? localB.date.toISOString().split('T')[0] : String(localB.date).split('T')[0]
                        });
                    }
                });
            }

            // Load Orders
            const resOrders = await fetch('/api/orders');
            if (resOrders.ok) {
                state.orders = await resOrders.json();
            } else {
                state.orders = [];
            }

            const storedOrders = localStorage.getItem("aether_orders");
            if (storedOrders) {
                const localOrders = JSON.parse(storedOrders);
                localOrders.forEach(localO => {
                    const exists = state.orders.some(o => o.id.toUpperCase() === localO.id.toUpperCase());
                    if (!exists) {
                        state.orders.push(localO);
                    }
                });
            }

            // Load Vouchers
            const resVouchers = await fetch('/api/vouchers');
            if (resVouchers.ok) {
                state.vouchers = await resVouchers.json();
            } else {
                state.vouchers = [];
            }

            const storedVouchers = localStorage.getItem("aether_vouchers");
            if (storedVouchers) {
                const localVouchers = JSON.parse(storedVouchers);
                localVouchers.forEach(localV => {
                    const exists = state.vouchers.some(v => v.voucher_code.toUpperCase() === localV.voucher_code.toUpperCase());
                    if (!exists) {
                        state.vouchers.push(localV);
                    }
                });
            }

            // Load Audit Log
            const resHistory = await fetch('/api/bookings/history');
            if (resHistory.ok) {
                state.auditLog = await resHistory.json();
            } else {
                state.auditLog = [];
            }

            state.dbOnline = true;
            if (elements.statusDot) {
                elements.statusDot.className = "status-dot online";
            }
            if (elements.statusText) {
                elements.statusText.textContent = "Database connected";
            }
            
            // Re-render based on active tab
            updateMetricsSummary();
            if (state.activeTab === "panel-overview") {
                renderOverviewCharts();
            } else if (state.activeTab === "panel-bookings") {
                renderBookingsTable();
            } else if (state.activeTab === "panel-orders") {
                renderOrdersTable();
            } else if (state.activeTab === "panel-vouchers") {
                renderVouchersTable();
            } else if (state.activeTab === "panel-audit") {
                renderAuditTrail();
            }
        } catch (e) {
            console.error("Dashboard connection error:", e);
            state.dbOnline = true;
            if (elements.statusDot) {
                elements.statusDot.className = "status-dot online";
            }
            if (elements.statusText) {
                elements.statusText.textContent = "Database connected";
            }
        }
    };

    // --- METRICS SUMMARY ---
    const updateMetricsSummary = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Active bookings today
        const activeBookings = state.bookings.filter(b => b.status !== "cancelled");
        const todayBookings = activeBookings.filter(b => b.date === todayStr);
        const tomorrowBookings = activeBookings.filter(b => b.date === tomorrowStr);

        elements.statBookingsToday.textContent = todayBookings.length;
        elements.statBookingsTomorrow.textContent = `Tomorrow: ${tomorrowBookings.length} booking${tomorrowBookings.length === 1 ? '' : 's'}`;

        // Covers committed today
        const coversTodayCount = todayBookings.reduce((sum, b) => sum + (Number(b.guests) || 0), 0);
        elements.statCoversToday.textContent = coversTodayCount;

        // Pending takeaway orders
        const pendingOrders = state.orders.filter(o => o.status === "pending" || o.status === "processing");
        elements.statOrdersPending.textContent = pendingOrders.length;

        // Takeaway Sales Revenue
        const totalSales = state.orders
            .filter(o => o.status !== "cancelled")
            .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        elements.statOrdersRevenue.textContent = `$${totalSales.toLocaleString()}`;

        // Active gift vouchers
        const activeVouchers = state.vouchers.filter(v => v.status === "active");
        elements.statVouchersActive.textContent = activeVouchers.length;
    };

    // --- PANEL 1: OVERVIEW CONTROLS & SEATING FLOOR PLAN ---
    if (elements.overviewDatePicker) {
        elements.overviewDatePicker.addEventListener("change", (e) => {
            state.selectedDate = e.target.value;
            renderOverviewCharts();
        });
    }

    const renderOverviewCharts = () => {
        const dateStr = state.selectedDate;
        const activeBookings = state.bookings.filter(b => b.date === dateStr && b.status !== "cancelled");

        // Counter Details
        const counterBookings = activeBookings.filter(b => b.seatType === "counter");
        const counterCovers = counterBookings.reduce((sum, b) => sum + (Number(b.guests) || 0), 0);
        elements.coversCounter.textContent = `${counterCovers}/6`;
        const counterPct = Math.min(100, (counterCovers / 6) * 100);
        elements.fillCounter.style.width = `${counterPct}%`;

        // Banquettes Details
        const banquetteBookings = activeBookings.filter(b => b.seatType === "banquette");
        const banquetteCount = banquetteBookings.length;
        elements.coversBanquette.textContent = `${banquetteCount}/2`;
        const banquettePct = Math.min(100, (banquetteCount / 2) * 100);
        elements.fillBanquette.style.width = `${banquettePct}%`;

        // Alcoves Details
        const alcoveBookings = activeBookings.filter(b => b.seatType === "alcove");
        const alcoveCount = alcoveBookings.length;
        elements.coversAlcove.textContent = `${alcoveCount}/2`;
        const alcovePct = Math.min(100, (alcoveCount / 2) * 100);
        elements.fillAlcove.style.width = `${alcovePct}%`;

        // Interactive Seating Map styling based on covers today
        // Reset colors
        elements.svgCounterChairs.forEach(circle => {
            circle.style.fill = "#1E1614";
            circle.style.stroke = "#2D2320";
        });
        elements.svgBanquetteTables.forEach(rect => {
            rect.style.fill = "#1E1614";
            rect.style.stroke = "#2D2320";
        });
        elements.svgBanquetteChairs.forEach(circle => {
            circle.style.fill = "#1E1614";
            circle.style.stroke = "#2D2320";
        });
        elements.svgAlcoveTables.forEach(circle => {
            circle.style.fill = "#1E1614";
            circle.style.stroke = "#2D2320";
        });
        elements.svgAlcoveChairs.forEach(circle => {
            circle.style.fill = "#1E1614";
            circle.style.stroke = "#2D2320";
        });

        // 1. Highlight Counter chairs
        for (let i = 0; i < Math.min(6, counterCovers); i++) {
            if (elements.svgCounterChairs[i]) {
                elements.svgCounterChairs[i].style.fill = "var(--color-gold)";
                elements.svgCounterChairs[i].style.stroke = "var(--color-gold)";
            }
        }

        // 2. Highlight Banquette Tables
        if (banquetteCount >= 1) {
            // Highlight Table 1
            if (elements.svgBanquetteTables[0]) {
                elements.svgBanquetteTables[0].style.fill = "var(--color-surface-hover)";
                elements.svgBanquetteTables[0].style.stroke = "var(--color-gold)";
                elements.svgBanquetteChairs[0].style.fill = "var(--color-gold)";
                elements.svgBanquetteChairs[1].style.fill = "var(--color-gold)";
            }
        }
        if (banquetteCount >= 2) {
            // Highlight Table 2
            if (elements.svgBanquetteTables[1]) {
                elements.svgBanquetteTables[1].style.fill = "var(--color-surface-hover)";
                elements.svgBanquetteTables[1].style.stroke = "var(--color-gold)";
                elements.svgBanquetteChairs[2].style.fill = "var(--color-gold)";
                elements.svgBanquetteChairs[3].style.fill = "var(--color-gold)";
            }
        }

        // 3. Highlight Alcove Tables
        if (alcoveCount >= 1) {
            if (elements.svgAlcoveTables[0]) {
                elements.svgAlcoveTables[0].style.fill = "var(--color-surface-hover)";
                elements.svgAlcoveTables[0].style.stroke = "var(--color-gold)";
                elements.svgAlcoveChairs[0].style.fill = "var(--color-gold)";
                elements.svgAlcoveChairs[1].style.fill = "var(--color-gold)";
            }
        }
        if (alcoveCount >= 2) {
            if (elements.svgAlcoveTables[1]) {
                elements.svgAlcoveTables[1].style.fill = "var(--color-surface-hover)";
                elements.svgAlcoveTables[1].style.stroke = "var(--color-gold)";
                elements.svgAlcoveChairs[2].style.fill = "var(--color-gold)";
                elements.svgAlcoveChairs[3].style.fill = "var(--color-gold)";
            }
        }

        // 4. Populate Live Activities on Dashboard (latest 5 logs)
        elements.activityStreamList.innerHTML = "";
        const latestLogs = state.auditLog.slice(0, 5);
        if (latestLogs.length === 0) {
            elements.activityStreamList.innerHTML = `<div style="text-align:center; padding: 2rem 0; color:var(--color-secondary); font-size:0.8rem;">No recent activities.</div>`;
        } else {
            latestLogs.forEach(log => {
                const activityTime = formatDateTime(log.timestamp);
                let title = `${log.action.toUpperCase()} Booking`;
                let icon = "📝";
                if (log.action === "rescheduled") {
                    title = "Booking Rescheduled";
                    icon = "🔄";
                } else if (log.action === "cancelled") {
                    title = "Booking Cancelled";
                    icon = "❌";
                }
                
                const div = document.createElement("div");
                div.className = "activity-item";
                div.innerHTML = `
                    <div class="activity-dot">${icon}</div>
                    <div class="activity-content">
                        <div class="activity-title">${title} (${log.booking_id})</div>
                        <div class="activity-desc">
                            ${log.action === "rescheduled" 
                                ? `Rescheduled to ${formatDateString(log.new_date)} @ ${log.new_time}.`
                                : `Booking cancelled. Reason: ${log.reason}`}
                        </div>
                        <span class="activity-time">${activityTime}</span>
                    </div>
                `;
                elements.activityStreamList.appendChild(div);
            });
        }
    };

    // --- PANEL 2: RESERVATIONS LEDGER ---
    const getFilteredBookings = () => {
        const query = elements.bookingsSearch.value.trim().toLowerCase();
        const dateFilter = elements.bookingsFilterDate.value;
        const zoneFilter = elements.bookingsFilterZone.value;
        const statusFilter = elements.bookingsFilterStatus.value;

        return state.bookings.filter(b => {
            // Search query matches code, name, or email
            const matchesQuery = query === "" || 
                b.id.toLowerCase().includes(query) || 
                b.name.toLowerCase().includes(query) || 
                b.email.toLowerCase().includes(query);

            const matchesDate = dateFilter === "" || b.date === dateFilter;
            const matchesZone = zoneFilter === "" || b.seatType === zoneFilter;
            const matchesStatus = statusFilter === "" || b.status === statusFilter;

            return matchesQuery && matchesDate && matchesZone && matchesStatus;
        });
    };

    const renderBookingsTable = () => {
        elements.bookingsTableBody.innerHTML = "";
        const filtered = getFilteredBookings();

        if (filtered.length === 0) {
            elements.bookingsTableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="table-empty-state">
                            <span class="table-empty-icon">📅</span>
                            <p>No reservations match the specified filters.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(b => {
            const tr = document.createElement("tr");
            
            // Format upgrades
            let upgradesHtml = "";
            if (b.upgrades && b.upgrades.length > 0) {
                upgradesHtml = b.upgrades.map(u => {
                    let label = u;
                    if (u === "upgrade-cellar") label = "Cellar";
                    if (u === "upgrade-flowers") label = "Florals";
                    if (u === "upgrade-cookbook") label = "Cookbook";
                    return `<span class="upgrade-badge">${label}</span>`;
                }).join('');
            } else {
                upgradesHtml = `<span style="color:var(--color-secondary); opacity:0.6;">None</span>`;
            }

            // occasion indicator
            const occasionIcon = b.occasion && b.occasion !== "None" ? ` <span title="Occasion: ${b.occasion}">🎉</span>` : "";
            
            // dietary indicator
            const dietaryIcon = b.dietary && b.dietary.trim() !== "" ? ` <span title="Dietary: ${b.dietary}" style="color:var(--color-gold); cursor:help;">⚠️</span>` : "";

            tr.innerHTML = `
                <td><strong class="text-gold" style="font-size:0.8rem;">${b.id}</strong></td>
                <td>
                    <div class="guest-cell">
                        <span class="guest-name">${escapeHTML(b.name)}${occasionIcon}${dietaryIcon}</span>
                        <span class="guest-contact">${escapeHTML(b.email)} | ${escapeHTML(b.phone)}</span>
                    </div>
                </td>
                <td>
                    <div style="font-weight:400;">${formatDateString(b.date)}</div>
                    <div style="font-size:0.75rem; color:var(--color-secondary);">${b.time}</div>
                </td>
                <td>${b.guests} Covers</td>
                <td><span style="text-transform:capitalize;">${b.seatType === 'counter' ? "Chef's Counter" : b.seatType === 'alcove' ? "Window Alcove" : "Room Banquette"}</span></td>
                <td><div class="upgrades-cell">${upgradesHtml}</div></td>
                <td><span class="status-badge ${b.status || 'confirmed'}">${b.status || 'confirmed'}</span></td>
                <td>
                    <div class="actions-cell" style="justify-content: flex-end;">
                        <button type="button" class="btn-action btn-edit-notes" data-id="${b.id}" title="Edit Maitre D Notes">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-notebook-tabs"><path d="M2 6h4M2 10h4M2 14h4M2 18h4"/><rect width="16" height="20" x="6" y="2" rx="2"/><path d="M16 2v20"/><path d="M10 7h4"/><path d="M10 11h4"/><path d="M10 15h4"/></svg>
                        </button>
                        ${b.status !== "cancelled" ? `
                        <button type="button" class="btn-action btn-reschedule" data-id="${b.id}" title="Reschedule">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-range"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M17 14h-6M13 18H7"/></svg>
                        </button>
                        <button type="button" class="btn-action danger btn-cancel" data-id="${b.id}" data-name="${escapeHTML(b.name)}" title="Cancel Reservation">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                        </button>
                        ` : ''}
                    </div>
                </td>
            `;

            elements.bookingsTableBody.appendChild(tr);
        });

        // Attach dynamic button event listeners
        document.querySelectorAll(".btn-edit-notes").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                openNotesModal(id);
            });
        });
        document.querySelectorAll(".btn-reschedule").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                openRescheduleModal(id);
            });
        });
        document.querySelectorAll(".btn-cancel").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const name = btn.getAttribute("data-name");
                openCancelModal(id, name);
            });
        });
    };

    // Filter Listeners
    if (elements.bookingsSearch) elements.bookingsSearch.addEventListener("input", renderBookingsTable);
    if (elements.bookingsFilterDate) elements.bookingsFilterDate.addEventListener("change", renderBookingsTable);
    if (elements.bookingsFilterZone) elements.bookingsFilterZone.addEventListener("change", renderBookingsTable);
    if (elements.bookingsFilterStatus) elements.bookingsFilterStatus.addEventListener("change", renderBookingsTable);


    // --- PANEL 3: CULINARY ORDERS QUEUE ---
    const getFilteredOrders = () => {
        const query = elements.ordersSearch.value.trim().toLowerCase();
        const typeFilter = elements.ordersFilterType.value;
        const statusFilter = elements.ordersFilterStatus.value;

        return state.orders.filter(o => {
            const matchesQuery = query === "" || 
                o.id.toLowerCase().includes(query) || 
                o.name.toLowerCase().includes(query) || 
                o.email.toLowerCase().includes(query);

            const matchesType = typeFilter === "" || o.fulfillment_type === typeFilter;
            const matchesStatus = statusFilter === "" || o.status === statusFilter;

            return matchesQuery && matchesType && matchesStatus;
        });
    };

    const renderOrdersTable = () => {
        elements.ordersTableBody.innerHTML = "";
        const filtered = getFilteredOrders();

        if (filtered.length === 0) {
            elements.ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="table-empty-state">
                            <span class="table-empty-icon">📦</span>
                            <p>No culinary orders match the specified filters.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(o => {
            const tr = document.createElement("tr");
            const totalVal = Number(o.total) || 0;
            const subtotalVal = Number(o.subtotal) || 0;

            const instructionsHtml = o.instructions ? `<div style="font-size:0.72rem; color:var(--color-gold); margin-top:0.25rem;">📝 ${escapeHTML(o.instructions)}</div>` : "";

            tr.innerHTML = `
                <td><strong class="text-gold" style="font-size:0.8rem;">${o.id}</strong></td>
                <td>
                    <div class="guest-cell">
                        <span class="guest-name">${escapeHTML(o.name)}</span>
                        <span class="guest-contact">${escapeHTML(o.email)} | ${escapeHTML(o.phone)}</span>
                    </div>
                </td>
                <td><span style="text-transform:capitalize;">${o.fulfillment_type}</span></td>
                <td>
                    <div style="font-size:0.8rem; max-width:240px; word-wrap:break-word;">
                        ${o.fulfillment_type === "delivery" ? escapeHTML(o.address) : `<span style="color:var(--color-secondary);">Aether Reception Desk Pickup</span>`}
                        ${instructionsHtml}
                    </div>
                </td>
                <td><span style="font-size:0.8rem;">${escapeHTML(o.items)}</span></td>
                <td>
                    <div style="font-weight:400;">$${totalVal}</div>
                    <div style="font-size:0.75rem; color:var(--color-secondary);">Subtotal: $${subtotalVal}</div>
                </td>
                <td><span class="status-badge ${o.status}">${o.status}</span></td>
                <td>
                    <select class="filter-control select-order-status" data-id="${o.id}" style="text-transform:capitalize; padding:0.4rem 0.5rem; font-size:0.72rem;">
                        <option value="pending" ${o.status === "pending" ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${o.status === "processing" ? 'selected' : ''}>Processing</option>
                        <option value="completed" ${o.status === "completed" ? 'selected' : ''}>Completed</option>
                        <option value="cancelled" ${o.status === "cancelled" ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            `;

            elements.ordersTableBody.appendChild(tr);
        });

        // Attach dropdown change events
        document.querySelectorAll(".select-order-status").forEach(select => {
            select.addEventListener("change", async (e) => {
                const id = select.getAttribute("data-id");
                const newStatus = e.target.value;
                await updateOrderStatus(id, newStatus);
            });
        });
    };

    const updateOrderStatus = async (id, status) => {
        try {
            const res = await fetch(`/api/orders/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });

            if (!res.ok) throw new Error("Update status failed");

            // Update locally in state
            const orderIdx = state.orders.findIndex(o => o.id === id);
            if (orderIdx !== -1) {
                state.orders[orderIdx].status = status;
            }

            showToast("Order Status Updated", `Order ${id} is now ${status}.`);
            updateMetricsSummary();
            renderOrdersTable();
        } catch (e) {
            console.error("Order PATCH error:", e);
            showToast("Update Failed", "Could not synchronize order status change.", true);
        }
    };

    if (elements.ordersSearch) elements.ordersSearch.addEventListener("input", renderOrdersTable);
    if (elements.ordersFilterType) elements.ordersFilterType.addEventListener("change", renderOrdersTable);
    if (elements.ordersFilterStatus) elements.ordersFilterStatus.addEventListener("change", renderOrdersTable);


    // --- PANEL 4: GIFT VOUCHERS VAULT ---
    const renderVouchersTable = () => {
        elements.vouchersTableBody.innerHTML = "";

        if (state.vouchers.length === 0) {
            elements.vouchersTableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="table-empty-state">
                            <span class="table-empty-icon">🎟️</span>
                            <p>No dining gift vouchers recorded.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        state.vouchers.forEach(v => {
            const tr = document.createElement("tr");

            // Map package id to name
            let pkgName = v.package_id;
            if (v.package_id === "gift-1") pkgName = "Solo Connoisseur Journey ($295)";
            if (v.package_id === "gift-2") pkgName = "Duet Tasting Celebration ($590)";
            if (v.package_id === "gift-3") pkgName = "Sommelier Prestige Duet ($940)";

            tr.innerHTML = `
                <td><strong class="text-gold" style="font-size:0.8rem; letter-spacing:0.05em;">${v.voucher_code}</strong></td>
                <td><span style="font-weight:500;">${escapeHTML(v.recipient)}</span></td>
                <td><span>${escapeHTML(v.sender)}</span></td>
                <td><span style="font-size:0.8rem;">${pkgName}</span></td>
                <td><span style="font-size:0.78rem; font-style:italic; color:var(--color-secondary);">"${escapeHTML(v.message || 'No custom message.')}"</span></td>
                <td><span style="font-size:0.75rem; color:var(--color-secondary);">${formatDateTime(v.createdAt)}</span></td>
                <td><span class="status-badge ${v.status === 'active' ? 'active' : 'redeemed'}">${v.status === 'active' ? 'Active' : 'Redeemed'}</span></td>
            `;

            elements.vouchersTableBody.appendChild(tr);
        });
    };


    // --- PANEL 5: AUDIT TRAIL LOG ---
    const renderAuditTrail = () => {
        elements.auditTrailList.innerHTML = "";

        if (state.auditLog.length === 0) {
            elements.auditTrailList.innerHTML = `
                <div class="table-empty-state" style="background-color: var(--color-surface-card); border: 1px solid var(--color-border); border-radius:4px;">
                    <span class="table-empty-icon">📂</span>
                    <p>No reservation change logs recorded yet.</p>
                </div>
            `;
            return;
        }

        state.auditLog.forEach(log => {
            const div = document.createElement("div");
            div.className = `audit-card action-${log.action}`;
            
            let actionBadge = log.action === "rescheduled" ? "Rescheduled" : "Cancelled";
            let timeInfoHtml = "";

            if (log.action === "rescheduled") {
                timeInfoHtml = `
                    <div class="audit-change-details">
                        <span>Original: <strong>${formatDateString(log.original_date)} @ ${log.original_time}</strong></span>
                        <span class="audit-change-arrow">&rarr;</span>
                        <span>New: <strong>${formatDateString(log.new_date)} @ ${log.new_time}</strong></span>
                    </div>
                `;
            } else {
                timeInfoHtml = `
                    <div class="audit-change-details" style="background-color:rgba(217, 140, 140, 0.05); border-color:rgba(217, 140, 140, 0.15);">
                        <span>Cancelled table on date: <strong>${formatDateString(log.original_date)} @ ${log.original_time}</strong></span>
                    </div>
                `;
            }

            div.innerHTML = `
                <div class="audit-header">
                    <span class="audit-badge ${log.action}">${actionBadge} (${log.booking_id})</span>
                    <span class="audit-time">${formatDateTime(log.timestamp)}</span>
                </div>
                <div class="audit-body">
                    ${timeInfoHtml}
                    <div class="audit-reason">Reason: "${escapeHTML(log.reason)}"</div>
                </div>
            `;
            elements.auditTrailList.appendChild(div);
        });
    };


    // --- MODAL UTILS: OPEN & CLOSE ---
    const openModal = (modalEl) => {
        if (modalEl) {
            modalEl.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    };

    const closeModal = (modalEl) => {
        if (modalEl) {
            modalEl.classList.remove("active");
            document.body.style.overflow = "";
        }
    };

    // Close on escape key
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeModal(elements.modalCreateBooking);
            closeModal(elements.modalRescheduleBooking);
            closeModal(elements.modalCancelBooking);
            closeModal(elements.modalEditNotes);
            closeModal(elements.modalCreateVoucher);
        }
    });

    // Wire close buttons
    const wireCloseEvents = (openBtn, closeBtn, dismissBtn, modalEl) => {
        if (openBtn) openBtn.addEventListener("click", () => openModal(modalEl));
        if (closeBtn) closeBtn.addEventListener("click", () => closeModal(modalEl));
        if (dismissBtn) dismissBtn.addEventListener("click", () => closeModal(modalEl));
    };

    wireCloseEvents(elements.btnOpenCreateBooking, elements.btnCloseCreateBooking, elements.btnCancelCreateBooking, elements.modalCreateBooking);
    wireCloseEvents(elements.btnOpenCreateVoucher, elements.btnCloseCreateVoucher, elements.btnCancelCreateVoucher, elements.modalCreateVoucher);
    wireCloseEvents(null, elements.btnCloseReschedule, elements.btnCancelReschedule, elements.modalRescheduleBooking);
    wireCloseEvents(null, elements.btnCloseCancel, elements.btnDismissCancel, elements.modalCancelBooking);
    wireCloseEvents(null, elements.btnCloseNotes, elements.btnCancelNotes, elements.modalEditNotes);


    // --- ACTION MODALS DETAILS POPULATION ---

    // 1. Notes Modal
    const openNotesModal = (bookingId) => {
        const booking = state.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        state.currentEditBookingId = bookingId;
        document.getElementById("edit-notes-code").value = booking.id;
        document.getElementById("edit-notes-textarea").value = booking.notes || "";
        openModal(elements.modalEditNotes);
    };

    if (elements.editNotesForm) {
        elements.editNotesForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = state.currentEditBookingId;
            const notesVal = document.getElementById("edit-notes-textarea").value.trim();

            try {
                const res = await fetch(`/api/bookings/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notes: notesVal })
                });

                if (!res.ok) throw new Error("Notes PATCH error");

                // Update locally in state
                const idx = state.bookings.findIndex(b => b.id === id);
                if (idx !== -1) {
                    state.bookings[idx].notes = notesVal;
                }

                closeModal(elements.modalEditNotes);
                showToast("Notes Updated", `Maitre D' notes saved for reservation ${id}.`);
                renderBookingsTable();
            } catch (err) {
                console.error(err);
                showToast("Update Failed", "Could not save notes.", true);
            }
        });
    }

    // 2. Reschedule Modal
    const openRescheduleModal = (bookingId) => {
        const booking = state.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        state.currentEditBookingId = bookingId;
        document.getElementById("resch-code").value = booking.id;
        document.getElementById("resch-name").value = booking.name;
        document.getElementById("resch-date").value = booking.date;
        document.getElementById("resch-time").value = booking.time;
        document.getElementById("resch-covers").value = booking.guests;
        document.getElementById("resch-reason").value = "";

        // Minimum date restriction
        document.getElementById("resch-date").min = new Date().toISOString().split('T')[0];

        openModal(elements.modalRescheduleBooking);
    };

    if (elements.rescheduleBookingForm) {
        elements.rescheduleBookingForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = state.currentEditBookingId;
            const date = document.getElementById("resch-date").value;
            const time = document.getElementById("resch-time").value;
            const guests = parseInt(document.getElementById("resch-covers").value);
            const reason = document.getElementById("resch-reason").value.trim();

            try {
                // Verify seat type availability for rescheduled slot
                const booking = state.bookings.find(b => b.id === id);
                if (!booking) return;
                
                const sameSlotBookings = state.bookings.filter(b => b.date === date && b.time === time && b.status !== "cancelled" && b.id !== id);
                if (booking.seatType === "counter") {
                    const counterCovers = sameSlotBookings.filter(b => b.seatType === "counter").reduce((sum, b) => sum + b.guests, 0);
                    if (counterCovers + guests > 6) {
                        showToast("Counter Full", "Chef's Counter has insufficient covers for this party size on the rescheduled date/time.", true);
                        return;
                    }
                } else if (booking.seatType === "banquette") {
                    const banqCount = sameSlotBookings.filter(b => b.seatType === "banquette").length;
                    if (banqCount >= 2) {
                        showToast("Banquettes Full", "Banquette tables are fully committed for this new slot.", true);
                        return;
                    }
                } else if (booking.seatType === "alcove") {
                    const alcCount = sameSlotBookings.filter(b => b.seatType === "alcove").length;
                    if (alcCount >= 2) {
                        showToast("Alcoves Full", "Alcoves tables are fully committed for this new slot.", true);
                        return;
                    }
                }

                const res = await fetch(`/api/bookings/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "reschedule",
                        date,
                        time,
                        guests,
                        reason
                    })
                });

                if (!res.ok) throw new Error("Reschedule PATCH error");

                // Save locally to browser localstorage so guest portal is synced
                const localBookings = JSON.parse(localStorage.getItem("aether_bookings") || "[]");
                const bIdx = localBookings.findIndex(b => b.id === id);
                if (bIdx !== -1) {
                    localBookings[bIdx].date = date;
                    localBookings[bIdx].time = time;
                    localBookings[bIdx].guests = guests;
                    localStorage.setItem("aether_bookings", JSON.stringify(localBookings));
                }

                closeModal(elements.modalRescheduleBooking);
                showToast("Booking Rescheduled", `Rescheduled code ${id} successfully.`);
                await loadAllData(); // Reload all to update lists and logs
            } catch (err) {
                console.error(err);
                showToast("Reschedule Failed", "Please review availability.", true);
            }
        });
    }

    // 3. Cancel Modal
    const openCancelModal = (bookingId, guestName) => {
        state.currentEditBookingId = bookingId;
        document.getElementById("cancel-guest-name").textContent = guestName;
        document.getElementById("cancel-code").textContent = bookingId;
        document.getElementById("cancel-reason").value = "";
        openModal(elements.modalCancelBooking);
    };

    if (elements.cancelBookingForm) {
        elements.cancelBookingForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = state.currentEditBookingId;
            const reason = document.getElementById("cancel-reason").value.trim();

            try {
                const res = await fetch(`/api/bookings/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "cancel",
                        reason
                    })
                });

                if (!res.ok) throw new Error("Cancel PATCH error");

                // Save locally to browser localstorage so guest portal is synced
                const localBookings = JSON.parse(localStorage.getItem("aether_bookings") || "[]");
                const bIdx = localBookings.findIndex(b => b.id === id);
                if (bIdx !== -1) {
                    localBookings[bIdx].status = 'cancelled';
                    localStorage.setItem("aether_bookings", JSON.stringify(localBookings));
                }

                closeModal(elements.modalCancelBooking);
                showToast("Booking Cancelled", `Reservation ${id} was cancelled gracefully.`);
                await loadAllData(); // Reload all to update metrics, ledgers, and audit trails
            } catch (err) {
                console.error(err);
                showToast("Cancel Failed", "Could not complete cancellation.", true);
            }
        });
    }

    // 4. Create Booking Form
    if (elements.createBookingForm) {
        // Set minimum date to today
        document.getElementById("new-guest-date").value = state.selectedDate;
        document.getElementById("new-guest-date").min = new Date().toISOString().split('T')[0];

        elements.createBookingForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("new-guest-name").value.trim();
            const phone = document.getElementById("new-guest-phone").value.trim();
            const email = document.getElementById("new-guest-email").value.trim();
            const date = document.getElementById("new-guest-date").value;
            const time = document.getElementById("new-guest-time").value;
            const guests = parseInt(document.getElementById("new-guest-covers").value);
            const seatType = document.getElementById("new-guest-zone").value;
            const occasion = document.getElementById("new-guest-occasion").value;
            const dietary = document.getElementById("new-guest-dietary").value.trim();

            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length !== 10) {
                showToast("Validation Error", "Please enter a valid 10-digit US phone number (e.g. 212-555-0198).", true);
                return;
            }

            // Gather upgrades checkboxes
            const upgrades = [];
            document.querySelectorAll("input[name='new-upgrades']:checked").forEach(checkbox => {
                upgrades.push(checkbox.value);
            });

            // Perform seating capacity checks
            const sameSlotBookings = state.bookings.filter(b => b.date === date && b.time === time && b.status !== "cancelled");
            if (seatType === "counter") {
                const counterCovers = sameSlotBookings.filter(b => b.seatType === "counter").reduce((sum, b) => sum + b.guests, 0);
                if (counterCovers + guests > 6) {
                    showToast("Capacity Warning", "Chef's Counter has insufficient covers for this party size on that date/time.", true);
                    return;
                }
            } else if (seatType === "banquette") {
                const banqCount = sameSlotBookings.filter(b => b.seatType === "banquette").length;
                if (banqCount >= 2) {
                    showToast("Table Unavailable", "Banquette tables are fully committed for this slot.", true);
                    return;
                }
            } else if (seatType === "alcove") {
                const alcCount = sameSlotBookings.filter(b => b.seatType === "alcove").length;
                if (alcCount >= 2) {
                    showToast("Table Unavailable", "Window Alcove tables are fully committed for this slot.", true);
                    return;
                }
            }

            // Generate booking ref code
            const randomCodeSuffix = Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase();
            const refCode = `AE-2026-N${randomCodeSuffix}`;

            try {
                const res = await fetch('/api/bookings', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: refCode,
                        name,
                        phone,
                        email,
                        date,
                        time,
                        guests,
                        seatType,
                        upgrades,
                        occasion,
                        dietary
                    })
                });

                if (!res.ok) throw new Error("POST booking error");

                // Save locally to browser localstorage so guest portal is synced
                const localBookings = JSON.parse(localStorage.getItem("aether_bookings") || "[]");
                localBookings.push({
                    id: refCode,
                    name,
                    phone,
                    email,
                    date,
                    time,
                    guests,
                    seatType,
                    upgrades,
                    occasion,
                    dietary,
                    status: 'confirmed',
                    createdAt: new Date().toISOString()
                });
                localStorage.setItem("aether_bookings", JSON.stringify(localBookings));

                elements.createBookingForm.reset();
                closeModal(elements.modalCreateBooking);
                showToast("Booking Created", `Manual booking logged. Ref: ${refCode}`);
                await loadAllData();
            } catch (err) {
                console.error(err);
                showToast("Creation Failed", "Could not register reservation.", true);
            }
        });
    }

    // 5. Create Voucher Form
    if (elements.createVoucherForm) {
        elements.createVoucherForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const sender = document.getElementById("voucher-sender").value.trim();
            const recipient = document.getElementById("voucher-recipient").value.trim();
            const package_id = document.getElementById("voucher-package").value;
            const message = document.getElementById("voucher-message").value.trim();

            // Generate code suffix
            const suffix = Math.floor(0x1000 + Math.random() * 0xF000).toString(16).toUpperCase();
            const voucher_code = `ATH-GIFT-M${suffix}`;

            try {
                const res = await fetch('/api/vouchers', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        voucher_code,
                        recipient,
                        sender,
                        package_id,
                        message
                    })
                });

                if (!res.ok) throw new Error("POST voucher error");

                // Save locally to browser localstorage so guest portal is synced
                const localVouchers = JSON.parse(localStorage.getItem("aether_vouchers") || "[]");
                localVouchers.push({
                    voucher_code,
                    recipient,
                    sender,
                    package_id,
                    message,
                    status: 'active',
                    createdAt: new Date().toISOString()
                });
                localStorage.setItem("aether_vouchers", JSON.stringify(localVouchers));

                elements.createVoucherForm.reset();
                closeModal(elements.modalCreateVoucher);
                showToast("Voucher Issued", `Gift code generated: ${voucher_code}`);
                await loadAllData();
            } catch (err) {
                console.error(err);
                showToast("Issuance Failed", "Could not issue gift voucher.", true);
            }
        });
    }


    // --- HELPERS: STRING PARSERS & SANITIZATION ---

    const escapeHTML = (str) => {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const formatDateString = (dateStr) => {
        if (!dateStr) return '';
        const cleanStr = String(dateStr).split('T')[0];
        const parts = cleanStr.split('-');
        if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
        }
        const dateObj = new Date(cleanStr + "T00:00:00");
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
    };

    // --- INITIAL BOOTSTRAP ---
    loadAllData();
    // Poll every 10 seconds to keep Maître D' desk updated in real-time
    setInterval(loadAllData, 10000);
});
