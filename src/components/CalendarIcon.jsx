import React from 'react';

// Custom calendar icon component that displays the actual day
export const CalendarIcon = ({ day, size = 16 }) => {
    // Ensure day is a valid number between 1-31
    const displayDay = (day >= 1 && day <= 31) ? day : '?';

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            style={{
                display: 'inline-block',
                verticalAlign: 'middle',
                marginRight: '2px'
            }}
        >
            {/* Calendar background - light gray/white */}
            <rect x="3" y="4" width="18" height="18" rx="2" fill="#f0f0f0" stroke="#999" strokeWidth="0.5" />

            {/* Calendar header (red top bar) */}
            <rect x="3" y="4" width="18" height="6" rx="2" fill="#dd4b39" />

            {/* Binding rings */}
            <circle cx="7" cy="3.5" r="1.2" fill="#888" />
            <circle cx="17" cy="3.5" r="1.2" fill="#888" />

            {/* White date area */}
            <rect x="4" y="11" width="16" height="10" rx="0.5" fill="white" />

            {/* Day number - dark text */}
            <text
                x="12"
                y="18.5"
                textAnchor="middle"
                fontSize={displayDay > 9 ? "9" : "10"}
                fontWeight="700"
                fill="#333"
                fontFamily="system-ui, -apple-system, sans-serif"
            >
                {displayDay}
            </text>
        </svg>
    );
};

export default CalendarIcon;
