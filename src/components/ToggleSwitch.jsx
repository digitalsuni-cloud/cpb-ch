import React from 'react';

const ToggleSwitch = ({ label, checked, onChange }) => (
    <label
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}
        onClick={(e) => {
            e.preventDefault();
            onChange(!checked);
        }}
    >
        <div style={{ position: 'relative', width: '40px', height: '22px', background: checked ? 'var(--primary)' : 'var(--bg-subtle)', borderRadius: '20px', transition: 'background 0.3s', border: '1px solid var(--border)' }}>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: checked ? 'calc(100% - 19px)' : '3px',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                background: 'white',
                borderRadius: '50%',
                transition: 'left 0.3s'
            }} />
        </div>
        <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>
    </label>
);

export default ToggleSwitch;
