'use client';

interface CheckIn {
  date: string;
  completed: boolean;
  value?: number;
}

interface CalendarHeatmapProps {
  checkIns: CheckIn[];
  targetValue?: number;
  onCellClick?: (date: string, checkIn: CheckIn | undefined) => void;
}

export function CalendarHeatmap({ 
  checkIns, 
  targetValue,
  onCellClick 
}: CalendarHeatmapProps) {
  // Generate last 90 days
  const today = new Date();
  const days: { date: string; dateObj: Date }[] = [];
  
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({ date: dateStr, dateObj: date });
  }
  
  // Create a map for quick lookup
  const checkInMap = new Map<string, CheckIn>();
  checkIns.forEach(ci => {
    checkInMap.set(ci.date, ci);
  });
  
  // Get day of week for each day
  const getDayOfWeek = (date: Date): number => {
    return date.getDay();
  };
  
  // Organize into weeks (starting from Sunday)
  const weeks: { date: string; dateObj: Date }[][] = [];
  let currentWeek: { date: string; dateObj: Date }[] = [];
  
  // Find the first day to start from
  const firstDay = days[0].dateObj;
  const firstDayOfWeek = getDayOfWeek(firstDay);
  
  // Add empty slots for days before the first day
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: '', dateObj: new Date() });
  }
  
  days.forEach(day => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  // Add remaining days
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', dateObj: new Date() });
    }
    weeks.push(currentWeek);
  }
  
  const getCellColor = (checkIn: CheckIn | undefined) => {
    if (!checkIn) return 'bg-gray-100';
    if (!checkIn.completed) return 'bg-red-200';
    
    // For measured habits, check if 50%+ of target
    if (targetValue && checkIn.value !== undefined) {
      const percentage = (checkIn.value / targetValue) * 100;
      if (percentage >= 50) return 'bg-yellow-200';
      return 'bg-green-200';
    }
    
    // Binary habits - completed is green
    return 'bg-green-200';
  };
  
  const getCellContent = (checkIn: CheckIn | undefined) => {
    if (!checkIn || !checkIn.completed) return '×';
    if (targetValue && checkIn.value !== undefined) {
      return checkIn.value.toString();
    }
    return '✓';
  };
  
  return (
    <div className="overflow-x-auto">
      {/* Day labels */}
      <div className="flex mb-1 text-xs text-gray-500">
        <div className="w-8"></div>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="flex-1 text-center">{day}</div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex gap-1">
            {/* Week number */}
            <div className="w-8 text-xs text-gray-400 flex items-center justify-center">
              {weekIndex + 1}
            </div>
            
            {/* Days */}
            {week.map((day, dayIndex) => {
              const checkIn = day.date ? checkInMap.get(day.date) : undefined;
              const isEmpty = !day.date;
              
              return (
                <button
                  key={dayIndex}
                  disabled={isEmpty}
                  onClick={() => !isEmpty && onCellClick?.(day.date, checkIn)}
                  className={`
                    flex-1 h-8 rounded flex items-center justify-center text-xs
                    ${isEmpty ? '' : getCellColor(checkIn)}
                    ${isEmpty ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}
                    ${checkIn?.completed ? 'text-green-800' : 'text-red-800'}
                  `}
                  title={day.date ? `${day.date}: ${checkIn?.completed ? 'Completed' : 'Missed'}` : ''}
                >
                  {isEmpty ? '' : getCellContent(checkIn)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-200 rounded"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-200 rounded"></div>
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-200 rounded"></div>
          <span>Missed</span>
        </div>
      </div>
    </div>
  );
}
