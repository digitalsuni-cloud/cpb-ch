import React from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import RuleGroup from './RuleGroup';
import { motion } from 'framer-motion';
import { FaPlus } from 'react-icons/fa';
import Tooltip from './Tooltip';

const RuleGroupList = () => {
    const { state, dispatch } = usePriceBook();
    const [isTopHovered, setIsTopHovered] = React.useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            dispatch({ type: 'REORDER_RULE_GROUPS', activeId: active.id, overId: over.id });
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div id="groupsContainer" role="region" aria-label="Rule groups">
                <div
                    style={{
                        height: '24px',
                        marginBottom: '12px',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                        width: '100%',
                        zIndex: 20
                    }}
                    onMouseEnter={() => setIsTopHovered(true)}
                    onMouseLeave={() => setIsTopHovered(false)}
                    onClick={() => dispatch({ type: 'ADD_RULE_GROUP', prepend: true })}
                >
                    <div style={{
                        width: '100%',
                        height: '1px',
                        background: isTopHovered
                            ? 'linear-gradient(90deg, transparent, var(--primary), transparent)'
                            : 'var(--border)',
                        opacity: isTopHovered ? 1 : 0.4,
                        transition: 'all 0.3s'
                    }} />

                    <motion.div
                        animate={{
                            scale: isTopHovered ? 1 : 0.8,
                            opacity: isTopHovered ? 1 : 0,
                            y: isTopHovered ? 0 : 5
                        }}
                        style={{
                            position: 'absolute',
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '5px 16px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                            pointerEvents: 'none',
                            zIndex: 2
                        }}
                    >
                        <FaPlus size={10} /> Insert Rule Group
                    </motion.div>

                    {!isTopHovered && (
                        <div style={{
                            position: 'absolute',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            border: '1px solid var(--primary)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--bg-deep)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s',
                            zIndex: 2
                        }}>
                            <FaPlus size={12} />
                        </div>
                    )}
                </div>

                <SortableContext
                    items={state.priceBook.ruleGroups.map(g => g.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {state.priceBook.ruleGroups.map((group, index) => (
                        <RuleGroup key={group.id} group={group} index={index} />
                    ))}
                </SortableContext>
            </div>
        </DndContext>
    );
};
export default RuleGroupList;
