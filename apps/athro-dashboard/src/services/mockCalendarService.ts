import { CalendarEvent, Schedule } from '../types/calendar';
import { addDays, setHours, setMinutes } from 'date-fns';

const today = new Date();

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Physics Study Session',
    start: setHours(setMinutes(today, 0), 14),
    end: setHours(setMinutes(today, 0), 15),
    athroId: '1',
    type: 'study',
    status: 'upcoming',
  },
  {
    id: '2',
    title: 'Mathematics Review',
    start: setHours(setMinutes(addDays(today, 1), 0), 10),
    end: setHours(setMinutes(addDays(today, 1), 0), 11),
    athroId: '2',
    type: 'review',
    status: 'upcoming',
  },
];

const mockSchedule: Schedule = {
  userId: 'user1',
  weeklyPreference: {
    '1': [ // Monday
      {
        start: setHours(setMinutes(today, 0), 9),
        end: setHours(setMinutes(today, 0), 12),
        available: true,
      },
    ],
    '3': [ // Wednesday
      {
        start: setHours(setMinutes(today, 0), 14),
        end: setHours(setMinutes(today, 0), 17),
        available: true,
      },
    ],
  },
  bookedSessions: mockEvents,
};

export const mockCalendarService = {
  getUpcomingEvents: () => mockEvents,
  getSchedule: () => mockSchedule,
  getEventById: (id: string) => mockEvents.find(event => event.id === id),
};
