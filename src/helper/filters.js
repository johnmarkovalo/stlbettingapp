import moment from 'moment';

export const duration = function (input, format) {
    if (!input) {
        return 'Connecting...'
    }
    let seconds = parseInt(input);

    let h = Math.floor(seconds / 3600);
    if (h < 10) h = "0" + h;

    let rem = seconds % 3600;
    let m = Math.floor(rem / 60);
    if (m < 10) m = "0" + m;

    let s = rem % 60;
    if (s < 10) s = "0" + s;
    return format.replace('%h%', h).replace('%m%', m).replace('%s%', s);
};

export const sessionDuration = function (startTime) {
    if (!startTime) {
        return 0
    }
    return Math.round(new Date().getTime() / 1000 - new Date(startTime).getTime() / 1000)
};

export const momentHumanize = (eventDuration, unit) => {
    var eventMDuration = moment.duration(eventDuration, unit);
    var eventDurationArray = [];
    if (eventMDuration.years() > 0) {
        eventDurationArray.push(eventMDuration.years() + ' years');
        eventMDuration.subtract(eventMDuration.years(), 'years')
    }
    if (eventMDuration.months() > 0) {
        eventDurationArray.push(eventMDuration.months() + ' months');
        eventMDuration.subtract(eventMDuration.months(), 'months')
    }
    if (eventMDuration.weeks() > 0) {
        eventDurationArray.push(eventMDuration.weeks() + ' weeks');
        eventMDuration.subtract(eventMDuration.weeks(), 'weeks')
    }
    if (eventMDuration.days() > 0) {
        eventDurationArray.push(eventMDuration.days() + ' days');
        eventMDuration.subtract(eventMDuration.days(), 'days')
    }
    if (eventMDuration.hours() > 0) {
        eventDurationArray.push(eventMDuration.hours() + ' hours');
        eventMDuration.subtract(eventMDuration.hours(), 'hours')
    }
    if (eventMDuration.minutes() > 0) {
        eventDurationArray.push(eventMDuration.minutes() + ' minutes');
        eventMDuration.subtract(eventMDuration.minutes(), 'minutes')
    }
    if (eventMDuration.seconds() > 0) {
        eventDurationArray.push(eventMDuration.seconds() + ' seconds');
    }
    return eventDurationArray.length === 1 ? eventDurationArray[0] :
        eventDurationArray.join(' and ')
}
