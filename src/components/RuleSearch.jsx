import React, { useState, useMemo } from 'react';
import Select, { components } from 'react-select';
import { usePriceBook } from '../context/PriceBookContext';

const RuleSearch = () => {
    const { state, dispatch } = usePriceBook();
    const { priceBook } = state;

    const options = useMemo(() => {
        const ops = [];
        priceBook.ruleGroups.forEach((group, gIndex) => {
            const dateRange = `${group.startDate}${group.endDate ? ' to ' + group.endDate : ''}`;
            const groupContext = `RG${gIndex + 1} | ${dateRange}`;
            group.rules.forEach((rule, rIndex) => {
                const fullLabel = `[${groupContext} | BR${rIndex + 1}] ${rule.name || '(Unnamed Rule)'}`;
                ops.push({
                    value: rule.id,
                    label: fullLabel,
                    groupId: group.id,
                    ruleId: rule.id,
                    term: rule.name
                });
            });
        });
        return ops;
    }, [priceBook.ruleGroups]);

    const CustomOption = ({ innerProps, label, isFocused }) => (
        <div
            {...innerProps}
            title={label}
            style={{
                ...innerProps.style,
                padding: '10px 12px 10px 16px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isFocused ? 'translateX(6px)' : 'translateX(0)',
                fontSize: '0.85rem'
            }}
        >
            {label}
        </div>
    );

    const CustomSingleValue = (props) => (
        <components.SingleValue {...props}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={props.children}>
                {props.children}
            </span>
        </components.SingleValue>
    );

    const handleChange = (selectedOption) => {
        if (!selectedOption) return;

        // First, expand the rule group if collapsed
        dispatch({
            type: 'UPDATE_RULE_GROUP',
            groupId: selectedOption.groupId,
            updates: { collapsed: false }
        });

        // Then expand the billing rule if collapsed
        dispatch({
            type: 'UPDATE_BILLING_RULE',
            groupId: selectedOption.groupId,
            ruleId: selectedOption.ruleId,
            updates: { collapsed: false }
        });

        // Wait a bit for the DOM to update, then scroll
        setTimeout(() => {
            const element = document.getElementById(selectedOption.ruleId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Highlight effect (temporary border)
                element.style.borderColor = 'var(--accent)';
                element.style.boxShadow = '0 0 0 3px var(--accent)';
                setTimeout(() => {
                    element.style.borderColor = '';
                    element.style.boxShadow = '';
                }, 2000);
            }
        }, 150);
    };

    const customStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: state.isFocused ? '0 0 0 1px var(--primary)' : 'none',
            color: 'var(--text-main)',
            minHeight: '40px',
            '&:hover': {
                borderColor: 'var(--text-muted)'
            }
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            zIndex: 100,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)'
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isFocused ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
            color: state.isFocused ? 'var(--primary)' : 'var(--text-main)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            padding: 0,
            transition: 'all 0.1s ease',
            borderLeft: `3px solid ${state.isFocused ? 'var(--primary)' : 'transparent'}`,
            fontWeight: state.isFocused ? '600' : '400'
        }),
        singleValue: (provided) => ({
            ...provided,
            color: 'var(--text-main)',
            fontSize: '0.85rem',
            margin: 0,
            padding: 0
        }),
        input: (provided) => ({
            ...provided,
            color: 'var(--text-main)',
            margin: 0,
            padding: 0,
            outline: 'none',
            border: 'none !important',
            boxShadow: 'none !important',
            background: 'transparent !important'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: 'var(--text-muted)',
            fontSize: '0.85rem'
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: '2px 8px'
        }),
        indicatorSeparator: () => ({
            display: 'none'
        })
    };

    return (
        <div style={{ marginBottom: '24px', zIndex: 100, position: 'relative', width: '100%' }}>
            <label style={{
                marginBottom: '8px',
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                Go to Billing Rule:
            </label>
            <Select
                options={options}
                onChange={handleChange}
                styles={customStyles}
                components={{ Option: CustomOption, SingleValue: CustomSingleValue, IndicatorSeparator: () => null }}
                placeholder="Search for a rule..."
                isClearable
                isSearchable
            />
        </div>
    );
};

export default RuleSearch;
