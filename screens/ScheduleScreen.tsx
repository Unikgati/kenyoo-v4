import React, { useState, useMemo, Fragment } from 'react';
import { useData } from '../context/DataContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Schedule } from '../types';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ScheduleScreen: React.FC = () => {
    const { schedule, generateSchedule, clearSchedule } = useData();
    const [rotationInterval, setRotationInterval] = useState(1);
    const [excludedDays, setExcludedDays] = useState<number[]>([0, 6]); // Default to excluding Sun, Sat

    const handleDayToggle = (dayIndex: number) => {
        setExcludedDays(prev => 
            prev.includes(dayIndex) 
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex]
        );
    };

    const handleGenerate = () => {
        if (rotationInterval <= 0) {
            alert("Rotation interval must be a positive number.");
            return;
        }
        generateSchedule({ rotationInterval, excludedDays });
    };

    const groupedSchedule = useMemo(() => {
        return schedule.reduce<Record<string, Schedule[]>>((acc, item) => {
            const dateKey = item.date;
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(item);
            return acc;
        }, {});
    }, [schedule]);
    
    const sortedDates = useMemo(() => Object.keys(groupedSchedule).sort(), [groupedSchedule]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Schedule Generation</CardTitle>
                    <CardDescription>Configure and generate a 30-day schedule for dedicated drivers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="rotationInterval" className="font-medium">Location Rotation Interval (days)</label>
                            <Input
                                id="rotationInterval"
                                type="number"
                                value={rotationInterval}
                                onChange={e => setRotationInterval(parseInt(e.target.value, 10) || 1)}
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="font-medium block mb-2">Exclude Days of the Week</label>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {WEEKDAYS.map((day, index) => (
                                    <div key={day} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`day-${index}`}
                                            checked={excludedDays.includes(index)}
                                            onChange={() => handleDayToggle(index)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <label htmlFor={`day-${index}`} className="ml-2 text-sm">
                                            {day}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <Button onClick={handleGenerate}>Generate Schedule</Button>
                    {schedule.length > 0 && (
                        <Button variant="destructive" onClick={clearSchedule}>Reset Schedule</Button>
                    )}
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Generated Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                    {schedule.length > 0 ? (
                        <div className="overflow-auto max-h-[60vh] border rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-secondary sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3">Driver</th>
                                        <th className="px-6 py-3">Location</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedDates.map(dateKey => (
                                        <Fragment key={dateKey}>
                                            <tr>
                                                <td colSpan={2} className="font-semibold bg-secondary/95 py-2 px-4 border-b border-t border-border">
                                                    {new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </td>
                                            </tr>
                                            {groupedSchedule[dateKey].map(item => (
                                                <tr key={item.id} className="border-b border-border last:border-b-0">
                                                    <td className="px-6 py-4 font-medium">{item.driverName}</td>
                                                    <td className="px-6 py-4">{item.locationName}</td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-foreground/70 py-8">No schedule generated. Use the tool above to create one.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ScheduleScreen;