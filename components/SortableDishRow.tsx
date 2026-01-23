
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface Props {
    id: string;
    children: React.ReactNode;
}

export const SortableDishRow: React.FC<Props> = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-start gap-1 pb-1">
            <button
                {...attributes}
                {...listeners}
                className="mt-4 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-[#C32026] touch-none transition-colors"
                title="Przesuń"
            >
                <GripVertical size={16} />
            </button>
            <div className="flex-grow min-w-0">
                {children}
            </div>
        </div>
    );
};
