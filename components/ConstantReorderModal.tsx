import React, { useState, useEffect } from 'react';
import { X, GripVertical } from 'lucide-react';
import { MenuItem } from '../types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ConstantReorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'daily' | 'subDaily';
    category?: string;
    items: MenuItem[];
    onSave: () => void;
}

const SortableItem = ({ id, name, category }: { id: string, name: string, category: string }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl mb-2 shadow-sm">
            <div {...attributes} {...listeners} className="text-gray-400 cursor-grab hover:text-gray-600">
                <GripVertical size={20} />
            </div>
            <div>
                <div className="font-bold text-[#4A2C2A]">{name}</div>
                <div className="text-xs text-gray-500">{category}</div>
            </div>
        </div>
    );
};

const ConstantReorderModal: React.FC<ConstantReorderModalProps> = ({ isOpen, onClose, mode, category, items, onSave }) => {
    const [sortedItems, setSortedItems] = useState<MenuItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Filter only relevant items and sort by current order
            let relevant = items.filter(i => mode === 'daily' ? i.isDaily : i.isSubDaily);

            if (category) {
                relevant = relevant.filter(i => i.category === category);
            }

            const sorted = relevant.sort((a, b) => {
                const orderA = mode === 'daily' ? (a.dailyOrder ?? 9999) : (a.subDailyOrder ?? 9999);
                const orderB = mode === 'daily' ? (b.dailyOrder ?? 9999) : (b.subDailyOrder ?? 9999);
                return orderA - orderB;
            });
            setSortedItems(sorted);
        }
    }, [isOpen, items, mode, category]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSortedItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const orderedIds = sortedItems.map(i => i.id);
            await fetch('/api/menu/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, orderedIds })
            });
            onSave();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Błąd zapisu kolejności');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[210] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-[#4A2C2A]">
                            Ustaw Kolejność {category ? `(${category})` : (mode === 'daily' ? 'Stałe Menu' : 'Stałe Abonament')}
                        </h3>
                        <p className="text-xs text-gray-500">Przeciągnij, aby zmienić kolejność</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                </div>

                <div className="overflow-y-auto flex-grow pr-2">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sortedItems.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {sortedItems.map(item => (
                                <SortableItem key={item.id} id={item.id} name={item.name} category={item.category} />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100 flex-shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
                        Anuluj
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 bg-[#4A2C2A] text-white font-bold rounded-xl hover:bg-[#3A2220] transition-colors disabled:opacity-50">
                        {isSaving ? 'Zapisywanie...' : 'Zapisz Kolejność'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConstantReorderModal;
