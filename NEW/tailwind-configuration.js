/**
 * Tailwind CSS Configuration - Enhanced for 3-Layer Menu
 * Defines the theme colors for the 3-layer navigation system
 */
window.addEventListener('DOMContentLoaded', function() {
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    "brand-blue": {
                        light: "#E6F0F8",
                        DEFAULT: "#004882",
                        dark: "#003B6B",
                    },
                    "brand-orange": {
                        light: "#FFF2E9",
                        DEFAULT: "#CA5010",
                        dark: "#A94210",
                    },
                    "brand-purple": {
                        light: "#F3E5F5",
                        DEFAULT: "#4B0082",
                        dark: "#3A0065",
                    },
                    "brand-green": {
                        light: "#E8F5E9",
                        DEFAULT: "#006400",
                        dark: "#004D00",
                    },
                    "brand-red": {
                        light: "#FBECEC",
                        DEFAULT: "#800000",
                        dark: "#660000",
                    },
                    "brand-turquoise": {
                        light: "#EAF7F7",
                        DEFAULT: "#006D77",
                        dark: "#00575F",
                    },
                },
                // NEW: Enhanced spacing for 3-layer menu
                spacing: {
                    'menu-1': '16px',  // Level 1 padding
                    'menu-2': '24px',  // Level 2 padding
                    'menu-3': '32px',  // Level 3 padding
                },
                // NEW: Enhanced z-index for proper layering
                zIndex: {
                    'menu-1': '10',
                    'menu-2': '20',
                    'menu-3': '30',
                    'dropdown': '100',
                }
            }
        }
    };
    
    console.log("3-Layer Menu: Tailwind configuration loaded");
});
