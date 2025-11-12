from datetime import datetime, timedelta, time
from dateutil import parser

def parse_datetime(dt_str):
    if isinstance(dt_str, str):
        return parser.parse(dt_str)
    return dt_str

def time_to_minutes(t):
    if isinstance(t, str):
        t = parser.parse(t).time()
    return t.hour * 60 + t.minute

def minutes_to_time(minutes):
    hours = minutes // 60
    mins = minutes % 60
    return time(hours, mins)

def get_day_of_week(dt):
    if isinstance(dt, str):
        dt = parser.parse(dt)
    return dt.weekday()

def day_name_to_number(day_name):
    days = {
        'monday': 0, 'mon': 0, 'poniedziałek': 0, 'pn': 0,
        'tuesday': 1, 'tue': 1, 'wtorek': 1, 'wt': 1,
        'wednesday': 2, 'wed': 2, 'środa': 2, 'sr': 2,
        'thursday': 3, 'thu': 3, 'czwartek': 3, 'cz': 3,
        'friday': 4, 'fri': 4, 'piątek': 4, 'pt': 4,
        'saturday': 5, 'sat': 5, 'sobota': 5, 'sb': 5,
        'sunday': 6, 'sun': 6, 'niedziela': 6, 'nd': 6
    }
    return days.get(day_name.lower(), None)

def time_overlaps(start1, end1, start2, end2):
    return start1 < end2 and start2 < end1

def slots_overlap(slot1_start, slot1_end, slot2_start, slot2_end):
    return slot1_start < slot2_end and slot2_start < slot1_end

def get_time_slots_for_day(availability_schedule, day_of_week, date):
    slots = []
    
    day_availability = None
    for avail in availability_schedule:
        if avail.get('day') == day_of_week:
            day_availability = avail
            break
    
    if not day_availability:
        return []
    
    time_ranges = day_availability.get('timeSlots', [])
    
    for time_range in time_ranges:
        start_time_str = time_range.get('start')
        end_time_str = time_range.get('end')
        
        if not start_time_str or not end_time_str:
            continue
        
        if isinstance(start_time_str, str):
            try:
                if ':' in start_time_str and len(start_time_str) <= 5:
                    parts = start_time_str.split(':')
                    start_time = time(int(parts[0]), int(parts[1]))
                else:
                    start_time = parser.parse(start_time_str).time()
            except:
                continue
        else:
            start_time = start_time_str
        
        if isinstance(end_time_str, str):
            try:
                if ':' in end_time_str and len(end_time_str) <= 5:
                    parts = end_time_str.split(':')
                    end_time = time(int(parts[0]), int(parts[1]))
                else:
                    end_time = parser.parse(end_time_str).time()
            except:
                continue
        else:
            end_time = end_time_str
        
        start_datetime = datetime.combine(date.date() if isinstance(date, datetime) else date, start_time)
        end_datetime = datetime.combine(date.date() if isinstance(date, datetime) else date, end_time)
        
        slots.append({
            'start': start_datetime,
            'end': end_datetime
        })
    
    return slots

def default_availability():
    return [
        {'day': 0, 'timeSlots': [{'start': '08:00', 'end': '16:00'}]},
        {'day': 1, 'timeSlots': [{'start': '08:00', 'end': '16:00'}]},
        {'day': 2, 'timeSlots': [{'start': '08:00', 'end': '16:00'}]},
        {'day': 3, 'timeSlots': [{'start': '08:00', 'end': '16:00'}]},
        {'day': 4, 'timeSlots': [{'start': '08:00', 'end': '16:00'}]}
    ]

