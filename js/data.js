/**
 * Aether NYC - Static & Simulated Data Configuration (Phase 2 Expanded)
 * 
 * This file serves as the data layer for the client-side demo. All items,
 * paths, copy, and date-based availability rules are defined here.
 */

// 1. Seasonal Tasting Menu (5-7 Courses, $295 / guest)
const tastingMenu = [
    {
        id: "course-1",
        name: "Amuse-Bouche: Oscietra Caviar",
        description: "Chilled golden potato chawanmushi, brown butter cream, crispy chive blossom.",
        image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=300&q=80",
        price: "Included"
    },
    {
        id: "course-2",
        name: "Hokkaido Scallop Crudo",
        description: "Preserved yuzu-kosho vinaigrette, finger lime, shiso infusion, sea grape.",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80",
        price: "Included"
    },
    {
        id: "course-3",
        name: "White Truffle Agnolotti",
        description: "Hand-folded pasta, Parmigiano-Reggiano riserva emulsion, shaved Umbrian white truffle.",
        image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=300&q=80",
        price: "Included"
    },
    {
        id: "course-4",
        name: "Atlantic Halibut Confit",
        description: "Poached in olive oil, charcoal-roasted leeks, saffron-scented lobster reduction.",
        image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=300&q=80",
        price: "Included"
    },
    {
        id: "course-5",
        name: "Miyazaki A5 Wagyu Striploin",
        description: "Wood-fired over binchotan, sunchoke puree, fermented black garlic jus, sea salt.",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80",
        price: "Included"
    },
    {
        id: "course-6",
        name: "Meyer Lemon & Shiso Sorbet",
        description: "A delicate palate cleanser infused with premium sake and wild mint.",
        image: "https://images.unsplash.com/photo-1517093157656-b9ecdf16371c?auto=format&fit=crop&w=300&q=80",
        price: "Included"
    },
    {
        id: "course-7",
        name: "Manjari Chocolate & Gold Leaf",
        description: "Smoked sea salt caramel, roasted hazelnut crunch, edible 24K gold leaf.",
        image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=300&q=80",
        price: "Included"
    }
];

// 2. Sommelier Wine Pairings (Curated pairings, $175 / guest)
const winePairingMenu = [
    {
        id: "wine-1",
        name: "Dom Pérignon Brut Champagne 2012",
        description: "Crisp stone fruit, mineral tension. Paired with Oscietra Caviar.",
        image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=300&q=80",
        price: "Pairing 1"
    },
    {
        id: "wine-2",
        name: "Egon Müller Scharzhofberger Riesling Kabinett 2020",
        description: "Off-dry white peach, elegant acidity. Paired with Hokkaido Scallop.",
        image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=300&q=80",
        price: "Pairing 2"
    },
    {
        id: "wine-3",
        name: "Domaine de la Romanée-Conti Grand Cru Burgundy 2017",
        description: "Red cherries, forest floor, velvet complexity. Paired with White Truffle Agnolotti.",
        image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=300&q=80",
        price: "Pairing 3"
    },
    {
        id: "wine-4",
        name: "Château d'Yquem Premier Cru Supérieur Sauternes 2015",
        description: "Candied apricot, honeysuckle, infinite finish. Paired with Manjari Chocolate.",
        image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=300&q=80",
        price: "Pairing 4"
    }
];

// 3. Enjoy Aether At Home (Culinary Boxes & Caviar)
const atHomeItems = [
    {
        id: "home-1",
        name: "The Aether Caviar & Champagne Box",
        description: "50g Oscietra Caviar, mother-of-pearl spoons, fresh buckwheat blinis, crême fraîche, and a chilled half-bottle of Ruinart Blanc de Blancs.",
        price: 245,
        image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=300&q=80"
    },
    {
        id: "home-2",
        name: "Urbani White Truffle & Pasta Kit",
        description: "House-made artisanal egg tagliolini, cultured truffle butter, and one whole fresh Italian White Truffle (approx. 20g) with a wood slicer.",
        price: 185,
        image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=300&q=80"
    },
    {
        id: "home-3",
        name: "Sommelier Signature Wine Case (3 Bottles)",
        description: "A private, custom-tailored collection of library vintages selected by our Lead Sommelier, complete with handwritten tasting notes.",
        price: 320,
        image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=300&q=80"
    }
];

// 4. Guest Testimonials (High-end fictional feedback)
const testimonials = [
    {
        quote: "An absolute masterclass in quiet elegance. The A5 Wagyu prepared over binchotan was culinary poetry, and the service was choreographed like a silent ballet.",
        author: "Julian Vance — New York Times"
    },
    {
        quote: "Aether accomplishes what few restaurants can: it feels both intensely exclusive and incredibly warm. The white truffle pasta remains unmatched in the city.",
        author: "Eleanor Sterling — Vogue"
    },
    {
        quote: "The sommelier pairings were revelatory. Every pour felt like a conversation with history. An unforgettable, deeply intimate evening.",
        author: "Dr. Alistair Croft — Discerning Guest"
    }
];

// 5. Dynamic Restaurant Availability Rules
function getAvailabilityForDate(date) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
    const dateNum = date.getDate();
    
    // Restaurant is closed on Sundays and Mondays
    if (dayOfWeek === 0 || dayOfWeek === 1) {
        return "closed";
    }
    
    // Fridays and Saturdays are high demand
    if (dayOfWeek === 5 || dayOfWeek === 6) {
        if (dateNum % 3 === 0) {
            return "booked";
        }
        return "limited";
    }
    
    // Weekdays (Tuesday, Wednesday, Thursday)
    if (dateNum % 5 === 0) {
        return "booked";
    } else if (dateNum % 4 === 0) {
        return "limited";
    }
    
    return "available";
}

// 6. Time slots configurations
const timeSlots = [
    { time: "5:30 PM", baseAvailability: "available" },
    { time: "6:00 PM", baseAvailability: "available" },
    { time: "6:30 PM", baseAvailability: "limited" },
    { time: "7:00 PM", baseAvailability: "booked" },
    { time: "7:30 PM", baseAvailability: "booked" },
    { time: "8:00 PM", baseAvailability: "available" },
    { time: "8:30 PM", baseAvailability: "available" },
    { time: "9:00 PM", baseAvailability: "limited" },
    { time: "9:30 PM", baseAvailability: "available" }
];


/* ==================== PHASE 2 ADDITIONAL DATA SETS ==================== */

// 7. Micro-Seasons Foraging Timeline (12 Months)
const seasonalTimelineData = [
    {
        month: "January",
        crop: "Black Winter Truffle & Sunchoke",
        desc: "Deep winter frost focuses sugar in root vegetables. We shave Umbrian winter truffles over slow-roasted sunchoke broth and pine-needle oil.",
        image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "February",
        crop: "Atlantic Sea Urchin & Winter Citrus",
        desc: "Maine sea urchin reaches peak sweet brininess in freezing waters. Paired with blood orange granite and preserved finger limes.",
        image: "https://images.unsplash.com/photo-1517093157656-b9ecdf16371c?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "March",
        crop: "Early Ramp Bulbs & Wild Chervil",
        desc: "The forest wakes. Early ramp bulbs are pickled and paired with binchotan-grilled squid and delicate spring herbs.",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "April",
        crop: "Foraged Morels & Spring Pea",
        desc: "Fleshy forest morels are pan-glazed in cultured butter, paired with sweet English pea puree and elderflower broth.",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "May",
        crop: "White Asparagus & Elderbloom",
        desc: "Prized white asparagus spears are poached in olive oil and served with toasted hazelnut hollandaise and tempura elderflowers.",
        image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "June",
        crop: "Farmed Strawberries & Green Almonds",
        desc: "Unripe green almonds provide dry crunch to fresh local strawberries, cold-pressed shiso juice, and whipped sea-salt cream.",
        image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "July",
        crop: "Atlantic Bluefin & Sea Fennel",
        desc: "Warm summer waters yield rich line-caught tuna. Glazed in smoked soy, served with salted sea fennel and toasted kelp.",
        image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "August",
        crop: "Heirloom Tomatoes & Fig Leaf",
        desc: "Sun-ripened tomatoes are clear-filtered into water jelly, paired with roasted fig leaves and hand-stretched buffalo curd.",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "September",
        crop: "Wild Matsutake & Autumn Pear",
        desc: "Pine forest matsutake mushrooms are steamed in clay pots, highlighted with a reduction of sweet asian pear and dashi.",
        image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "October",
        crop: "Umbrian White Truffle & Chestnut",
        desc: "The pinnacle of our autumn menu. Shaved fresh white truffles rest on rich chestnut agnolotti and melted brown butter.",
        image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "November",
        crop: "Dry-Aged Venison & Juniper Berry",
        desc: "Venison saddle aged for 21 days on pine boughs, wood-seared and plated with wild juniper reduction and smoked parsnip.",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80"
    },
    {
        month: "December",
        crop: "Kodiak Red King Crab & Spruce",
        desc: "Sweet king crab claw meat is butter-poached, served alongside roasted sunchokes and a delicate emulsion of winter spruce oil.",
        image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80"
    }
];

// 8. Virtual Sommelier Palate Options & Matching Wines
const sommelierAssistantData = {
    crisp: {
        wine: "Ramonet Bâtard-Montrachet Grand Cru 2015",
        notes: "Brilliant acidity, toasted hazelnut, lemon zest, and immense stony minerality. Perfect for pairing with Hokkaido Scallop Crudo and Caviar.",
        price: "$195 per glass"
    },
    velvet: {
        wine: "Château Margaux Grand Cru Classé 1996",
        notes: "Seductive aromas of black currants, sweet violets, and cedar wood. Features silky, fully mature tannins. Outstanding with Miyazaki A5 Wagyu.",
        price: "$210 per glass"
    },
    mineral: {
        wine: "Krug Clos d'Ambonnay Brut Champagne 2002",
        notes: "An exceptionally rare single-plot Pinot Noir Champagne. Complex red fruit notes, brioche yeastiness, and a deep limestone chalk finish.",
        price: "$275 per glass"
    }
};

// 9. Gift Experience Packages
const giftPackages = [
    {
        id: "gift-1",
        name: "Solo Connoisseur Journey",
        description: "Full 7-course seasonal tasting menu entry for one guest.",
        price: 295
    },
    {
        id: "gift-2",
        name: "Duet Tasting Celebration",
        description: "Full 7-course seasonal tasting menu entry for two guests.",
        price: 590
    },
    {
        id: "gift-3",
        name: "Sommelier Prestige Duet",
        description: "7-course seasonal tasting menu entry plus prestige wine pairings for two guests.",
        price: 940
    }
];

// 10. Seating Location Details
const seatingLocations = {
    counter: {
        name: "Chef's Counter Seating",
        desc: "6 premium high-chairs lining the open hearth. Watch the kitchen choreography up close and interact directly with the chefs.",
        extraFee: 0
    },
    banquette: {
        name: "Dining Room Banquette",
        desc: "Plush leather wall benches. Offers relaxed comfort, acoustic intimacy, and a panoramic view of the entire dim-lit room.",
        extraFee: 0
    },
    alcove: {
        name: "Window Alcove Table",
        desc: "An exclusive table tucked into a velvet-draped window alcove. Offers peak privacy, perfect for romantic celebrations.",
        extraFee: 50
    }
};

// Export modules to window object for browser access
window.AetherData = {
    tastingMenu,
    winePairingMenu,
    atHomeItems,
    testimonials,
    getAvailabilityForDate,
    timeSlots,
    seasonalTimelineData,
    sommelierAssistantData,
    giftPackages,
    seatingLocations
};
