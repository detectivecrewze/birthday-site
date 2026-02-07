// Birthday Admin Configuration Module
// Contains all constants, page types, and default configurations

const LS_KEY = 'birthday_engine_config';

// Page Type Definitions - Central configuration for all page types
const PAGE_TYPES = {
    'memory-box': {
        icon: 'package_2',
        name: 'Memory Box',
        description: 'A locked box with secret question',
        fields: [
            { key: 'boxTarget', label: "Person's name on the box", type: 'text' },
            { key: 'question', label: 'Secret Question to open the box', type: 'text' },
            { key: 'placeholder', label: 'Hint inside the answer box', type: 'text' },
            { key: 'correctAnswer', label: 'The Secret Answer (all lowercase)', type: 'text' },
            { key: 'birthdayDate', label: 'Birthday Date & Time (for countdown)', type: 'datetime' },
            { key: 'countdownEnabled', label: 'Show a live countdown?', type: 'boolean' }
        ]
    },
    'inside-box': {
        icon: 'drafts',
        name: 'Inside Box',
        description: 'A heartfelt letter page',
        fields: [
            { key: 'greeting', label: 'Greeting Header (Top)', type: 'text' },
            { key: 'letterTitle', label: 'Letter Heading (highlight with <span>)', type: 'text' },
            { key: 'letterBody', label: 'The Main Letter Content', type: 'textarea' },
            { key: 'letterSign', label: 'Your Signature (bottom)', type: 'text' },
            { key: 'footerText', label: 'Small footer note', type: 'text' }
        ]
    },
    'music-player': {
        icon: 'album',
        name: 'Music Player',
        description: 'A vintage vinyl music box experience',
        fields: [
            { key: 'tracks', label: 'Your Playlist (max 3 songs)', type: 'list', itemType: 'track', maxItems: 3 },
            { key: 'buttonText', label: 'Continue Button Text', type: 'text' }
        ]
    },
    'lifetime-receipt': {
        icon: 'receipt_long',
        name: 'Lifetime Receipt',
        description: 'A receipt showing time spent together',
        fields: [
            { key: 'birthDate', label: 'Their Birth Date', type: 'date' },
            { key: 'title', label: 'Receipt Title', type: 'text' },
            { key: 'labelYears', label: 'Label for Years', type: 'text' },
            { key: 'labelMonths', label: 'Label for Months', type: 'text' },
            { key: 'labelDays', label: 'Label for Days', type: 'text' },
            { key: 'labelHours', label: 'Label for Hours', type: 'text' },
            { key: 'labelMinutes', label: 'Label for Minutes', type: 'text' },
            { key: 'labelSeconds', label: 'Label for Seconds', type: 'text' },
            { key: 'footerText', label: 'Bottom Message', type: 'text' },
            { key: 'buttonText', label: 'Continue Button Text', type: 'text' }
        ]
    },
    'message': {
        icon: 'chat_bubble',
        name: 'Simple Message',
        description: 'A simple message page',
        fields: [
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'content', label: 'Message Content', type: 'textarea' },
            { key: 'buttonText', label: 'Button Text', type: 'text' }
        ]
    },
    'birthday-newspaper': {
        icon: 'newspaper',
        name: 'Birthday Newspaper',
        description: 'A vintage newspaper layout',
        fields: [
            { key: 'title', label: 'Name of the Newspaper', type: 'text' },
            { key: 'edition', label: 'Edition Label (e.g. Special Edition)', type: 'text' },
            { key: 'date', label: 'Date shown on paper', type: 'text' },
            { key: 'price', label: 'Price shown on paper', type: 'text' },
            { key: 'mainHeadline', label: 'The BIG Newspaper Headline', type: 'text' },
            { key: 'mainPhoto', label: 'Large Newspaper Photo', type: 'file' },
            { key: 'articles', label: 'Small Articles (Add 3 stories)', type: 'list', itemType: 'article' },
            { key: 'buttonText', label: 'Next Page Button', type: 'text' }
        ]
    },
    'polaroid-stack': {
        icon: 'photo_library',
        name: 'Polaroid Stack',
        description: 'A gallery of polaroid photos',
        fields: [
            { key: 'photos', label: 'Your Polaroid Collection', type: 'list', itemType: 'photo', collapsible: true },
            { key: 'buttonText', label: 'Next Page Button', type: 'text' }
        ]
    },
    'traveler-map': {
        icon: 'map',
        name: 'Traveler Map',
        description: 'Interactive map with memory pins',
        fields: [
            { key: 'pins', label: 'Memory Locations', type: 'list', itemType: 'pin', collapsible: true },
            { key: 'buttonText', label: 'Continue Button Text', type: 'text' }
        ]
    },
    'analog-voice-note': {
        icon: 'settings_voice',
        name: 'Analog Voice Note',
        description: 'A cassette voice recording player',
        fields: [
            { key: 'audioUrl', label: 'Voice Recording (Upload audio file)', type: 'file' },
            { key: 'buttonText', label: 'Continue Button Text', type: 'text' }
        ]
    },
    'time-capsule-stitch': {
        icon: 'inventory_2',
        name: 'Time Capsule',
        description: 'A sealed message for the future',
        fields: [
            { key: 'inisial', label: 'Seal Initial (1 letter)', type: 'text' }
        ]
    },
    'scratch-card': {
        icon: 'auto_fix_high',
        name: 'Scratch Card',
        description: 'Interactive scratch-to-reveal surprise',
        fields: [
            { key: 'title', label: 'Headline (use <span> for accent)', type: 'text' },
            { key: 'subtitle', label: 'Small description', type: 'text' },
            { key: 'mainPhoto', label: 'Hidden Photo (to be scratched)', type: 'file' },
            { key: 'overlayColor', label: 'Scratch Coating Color (Hex)', type: 'text' },
            { key: 'brushSize', label: 'Scratch Brush Size (10-100)', type: 'number' },
            { key: 'finishMessage', label: 'Message when reveal is 90%', type: 'text' },
            { key: 'buttonText', label: 'Next Page Button', type: 'text' }
        ]
    },
    'finish': {
        icon: 'check_circle',
        name: 'Finish Page',
        description: 'Final page with recipient name and sharing options',
        fields: [
            { key: 'title', label: 'Page Title', type: 'text' },
            { key: 'subtitle', label: 'Subtitle', type: 'text' },
            { key: 'recipientName', label: 'Default Recipient Name (optional)', type: 'text' }
        ]
    }
};

// Default configuration for new pages
const DEFAULT_PAGE_FIELDS = {
    'memory-box': {
        boxTarget: "Sarah",
        question: "What is my favorite color?",
        placeholder: "type here...",
        correctAnswer: "blue",
        birthdayDate: new Date().toISOString(),
        countdownEnabled: true
    },
    'inside-box': {
        greeting: "Dear Sarah",
        letterTitle: "A <span>Special</span> Letter",
        letterBody: "Write your heart out here...",
        letterSign: "With love, Me",
        footerText: "P.S. I love you"
    },
    'music-player': {
        tracks: [
            { songTitle: "Your Song", artist: "Your Artist", audioUrl: "" }
        ],
        buttonText: "Continue"
    },
    'lifetime-receipt': {
        birthDate: "2000-01-01",
        title: "Official Memory Log",
        footerText: "Non-refundable memories.",
        buttonText: "Continue Journey"
    },
    'polaroid-stack': {
        photos: [],
        buttonText: "View More"
    },
    'birthday-newspaper': {
        title: "The Daily Love",
        edition: "Special Edition",
        date: "Today",
        price: "Priceless",
        mainHeadline: "Sarah Celebrates!",
        mainPhoto: "",
        articles: [],
        buttonText: "Read More"
    },
    'traveler-map': {
        pins: [],
        buttonText: "Continue"
    },
    'analog-voice-note': {
        audioUrl: "",
        buttonText: "Continue"
    },
    'time-capsule-stitch': {
        inisial: "S"
    },
    'scratch-card': {
        title: "Scratch <span>for a</span> Surprise",
        subtitle: "Reveal what's hidden underneath!",
        mainPhoto: "",
        overlayColor: "#94a3b8",
        brushSize: 40,
        finishMessage: "Surprise!",
        buttonText: "Take a Screenshot"
    },
    'message': {
        title: "A Message For You",
        content: "Write your message here...",
        buttonText: "Continue"
    },
    'finish': {
        title: "Your Memory Box is Ready",
        subtitle: "Personalize your gift before sharing",
        recipientName: ""
    }
};

// Theme field definitions
const THEME_FIELDS = [
    { key: 'ribbonColor', label: 'Ribbons & Stamps', type: 'color' },
    { key: 'paperColor', label: 'Site Background', type: 'color' },
    { key: 'paperImage', label: 'Background Photo (.png / .jpg)', type: 'image' },
    { key: 'cardboardColor', label: 'Box Textures', type: 'color' },
    { key: 'textColor', label: 'Main Ink Color', type: 'color' }
];

// Default theme presets
const THEME_PRESETS = [
    { name: 'Classic Vintage', colors: ['#b33939', '#fdfaf1', '#c2a382', '#2d2926'] },
    { name: 'Modern Midnight', colors: ['#2c3e50', '#edf2f7', '#95a5a6', '#2c3e50'] },
    { name: 'Royal Gold', colors: ['#6d214f', '#f8efba', '#2c3e50', '#182c61'] },
    { name: 'Deep Sea', colors: ['#1e3799', '#f1f2f6', '#4a69bd', '#0c2461'] },
    { name: 'Forest Tale', colors: ['#009432', '#f7f1e3', '#84817a', '#2c2c2c'] }
];

// Icon list for picker
const ICON_LIST = [
    'favorite', 'cake', 'celebration', 'history', 'photo_camera', 'location_on', 'movie', 'restaurant', 'home',
    'flight', 'hiking', 'beach_access', 'pets', 'music_note', 'auto_stories', 'brush', 'local_florist',
    'star', 'diamond', 'sunny', 'bedtime', 'cloud', 'water_drop', 'eco', 'volunteer_activism',
    'wine_bar', 'local_cafe', 'fastfood', 'map', 'explore', 'directions_car', 'directions_bike',
    'rocket_launch', 'sailing', 'anchor', 'kayaking', 'sports_keyboard', 'videogame_asset',
    'terminal', 'code', 'book', 'event', 'alarm', 'timer', 'lock', 'key', 'shopping_bag', 'gift'
];

// Default config structure
const DEFAULT_CONFIG = {
    theme: {
        ribbonColor: "#1e3799",
        paperColor: "#f1f2f6",
        paperImage: "",
        cardboardColor: "#4a69bd",
        textColor: "#0c2461"
    },
    metadata: {
        customerName: "",
        senderName: ""
    },
    pages: [
        {
            "type": "memory-box",
            "topMessage": "Tucked away with love...",
            "mainTitle": "A Journey through <span>Memories</span>",
            "boxLabel": "Strictly Private",
            "boxTarget": "Sarah",
            "question": "What is my favorite color?",
            "placeholder": "Try to remember it",
            "correctAnswer": "blue",
            "hidden": false
        },
        {
            "type": "music-player",
            "tracks": [
                { "songTitle": "Your Song", "artist": "Your Artist", "audioUrl": "" }
            ],
            "buttonText": "Continue"
        },
        {
            "type": "inside-box",
            "greeting": "Happy Birthday,",
            "letterTitle": "A Letter <span>for You</span>",
            "letterBody": "Write your heart out here...",
            "letterSign": "With love, Aldo",
            "footerText": "The best is yet to come..."
        },
        {
            "type": "lifetime-receipt",
            "birthDate": "2000-01-01",
            "title": "Itemized Memory Log",
            "footerText": "Keep this receipt in your heart.",
            "buttonText": "Continue"
        }
    ]
};

// Wizard step definitions
const WIZARD_STEPS = [
    { id: 'setup', name: 'Setup', title: 'Theme & Names', icon: 'palette' },
    { id: 'pages', name: 'Pages', title: 'Build the Journey', icon: 'view_carousel' },
    { id: 'finish', name: 'Finish', title: 'Export & Share', icon: 'check_circle' }
];
