/**
 * Tailwind CSS Configuration
 * Defines the theme colors for the navigation system
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
                }
            }
        }
    };
});