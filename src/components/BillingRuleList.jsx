import React from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import BillingRule from './BillingRule';

const BillingRuleList = ({ groupId, rules }) => {
    const { dispatch } = usePriceBook();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            dispatch({ type: 'REORDER_BILLING_RULES', groupId, activeId: active.id, overId: over.id });
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="rules">
                <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    {rules.map(rule => (
                        <BillingRule key={rule.id} rule={rule} groupId={groupId} />
                    ))}
                </SortableContext>
            </div>
        </DndContext>
    );
};
export default BillingRuleList;
