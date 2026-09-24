/* ----------------------------------------------------------------
   Sample data for the /demo dashboard. Everything here is fictional.
   Days are offsets from today, so the demo always looks current.
---------------------------------------------------------------- */

export const CLINIC = {
  name: 'Smile Studio Dental & Skin',
  area: 'Indiranagar',
  hours: 'Mon–Sat · 10 AM – 8 PM',
  doctors: ['Dr. Ananya Rao', 'Dr. Karan Mehta', 'Dr. Farah Khan'],
}

// Clinic is closed on Sundays (the AI still answers).
export const isClosed = (date) => date.getDay() === 0

export const dateForOffset = (offset) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

// source: how the booking came in. reminder: confirmed | sent | scheduled
const RAW_APPOINTMENTS = [
  { day: 0, time: '10:30', patient: 'Meera Iyer', treatment: 'Teeth cleaning', doctor: 'Dr. Ananya Rao', source: 'whatsapp', reminder: 'confirmed' },
  { day: 0, time: '11:15', patient: 'Arjun Nair', treatment: 'Root canal (sitting 2)', doctor: 'Dr. Karan Mehta', source: 'call', reminder: 'confirmed' },
  { day: 0, time: '12:00', patient: 'Sana Sheikh', treatment: 'Acne consultation', doctor: 'Dr. Farah Khan', source: 'instagram', reminder: 'confirmed' },
  { day: 0, time: '15:30', patient: 'Vikram Joshi', treatment: 'Braces review', doctor: 'Dr. Ananya Rao', source: 'walkin', reminder: 'sent' },
  { day: 0, time: '17:00', patient: 'Priya Menon', treatment: 'Chemical peel', doctor: 'Dr. Farah Khan', source: 'call', reminder: 'sent' },
  { day: 1, time: '10:00', patient: 'Rahul Gupta', treatment: 'Tooth extraction', doctor: 'Dr. Karan Mehta', source: 'call', reminder: 'sent' },
  { day: 1, time: '11:30', patient: 'Ayesha Siddiqui', treatment: 'Hair-fall consultation', doctor: 'Dr. Farah Khan', source: 'whatsapp', reminder: 'sent' },
  { day: 1, time: '16:00', patient: 'Deepak Reddy', treatment: 'Crown fitting', doctor: 'Dr. Ananya Rao', source: 'call', reminder: 'sent' },
  { day: 2, time: '10:30', patient: 'Kavya Shetty', treatment: 'Teeth whitening', doctor: 'Dr. Ananya Rao', source: 'instagram', reminder: 'scheduled' },
  { day: 2, time: '13:00', patient: 'Nikhil Bansal', treatment: 'Filling', doctor: 'Dr. Karan Mehta', source: 'call', reminder: 'scheduled' },
  { day: 3, time: '12:30', patient: 'Pooja Kulkarni', treatment: 'Pigmentation follow-up', doctor: 'Dr. Farah Khan', source: 'whatsapp', reminder: 'scheduled' },
  { day: 3, time: '18:00', patient: 'Imran Qureshi', treatment: 'Dental check-up', doctor: 'Dr. Karan Mehta', source: 'call', reminder: 'scheduled' },
  { day: 4, time: '11:00', patient: 'Sneha Pillai', treatment: 'Teeth cleaning', doctor: 'Dr. Ananya Rao', source: 'recall', reminder: 'scheduled' },
  { day: 5, time: '10:00', patient: 'Harish Rao', treatment: 'Implant consultation', doctor: 'Dr. Karan Mehta', source: 'call', reminder: 'scheduled' },
  { day: 5, time: '14:30', patient: 'Tanvi Desai', treatment: 'Laser hair removal', doctor: 'Dr. Farah Khan', source: 'instagram', reminder: 'scheduled' },
  { day: 6, time: '12:00', patient: 'Manoj Kumar', treatment: 'Dental check-up', doctor: 'Dr. Ananya Rao', source: 'recall', reminder: 'scheduled' },
]

export const initialAppointments = () =>
  RAW_APPOINTMENTS.filter((a) => !isClosed(dateForOffset(a.day))).map((a, i) => ({ id: `a${i}`, ...a }))

// outcome: booked | needs-you | answered | rescheduled
export const initialConversations = () => [
  {
    id: 'c1',
    name: 'Arjun Nair',
    phone: '+91 98•••• 4521',
    channel: 'call',
    time: '9:42 PM',
    afterHours: true,
    language: 'Hinglish',
    outcome: 'booked',
    summary: 'Pain after first root canal sitting — booked sitting 2 for today 11:15 AM.',
    transcript: [
      { from: 'patient', text: 'Hello, clinic band hai kya? Root canal ke baad se bahut dard ho raha hai.' },
      { from: 'ai', text: 'Namaste, Smile Studio Dental. Clinic abhi band hai, but main aapki help kar sakti hoon. Aapka first sitting kab hua tha?' },
      { from: 'patient', text: 'Parso. Dr. Karan ne kiya tha.' },
      { from: 'ai', text: 'Samajh gayi. Kal subah 11:15 pe Dr. Karan Mehta ke saath second sitting ka slot hai. Book kar doon? Tab tak agar swelling ya fever ho toh please turant emergency number pe call kariye.' },
      { from: 'patient', text: 'Haan, 11:15 book kar do.' },
      { from: 'ai', text: 'Done, Arjun ji. WhatsApp pe confirmation bhej diya hai.' },
      { from: 'system', text: 'Booked · 11:15 AM · Dr. Karan Mehta · WhatsApp confirmation sent' },
    ],
  },
  {
    id: 'c2',
    name: 'Meera Iyer',
    phone: '+91 97•••• 1180',
    channel: 'whatsapp',
    time: '10:05 PM',
    afterHours: true,
    language: 'English',
    outcome: 'booked',
    summary: 'Asked cleaning price, booked 10:30 AM with Dr. Ananya Rao.',
    transcript: [
      { from: 'patient', text: 'Hi, how much is teeth cleaning?' },
      { from: 'ai', text: 'Hi Meera! Scaling & polishing is ₹1,200 and takes about 40 minutes. Would you like a slot this week?' },
      { from: 'patient', text: 'Tomorrow morning if possible' },
      { from: 'ai', text: 'Tomorrow 10:30 AM with Dr. Ananya Rao is free. Shall I book it?' },
      { from: 'patient', text: 'Yes please' },
      { from: 'system', text: 'Booked · 10:30 AM · Dr. Ananya Rao · Reminder scheduled' },
    ],
  },
  {
    id: 'c3',
    name: 'Unknown caller',
    phone: '+91 90•••• 7734',
    channel: 'call',
    time: '8:14 AM',
    afterHours: true,
    language: 'Hindi',
    outcome: 'needs-you',
    summary: 'Asking whether a 6-year-old with a chipped tooth needs X-ray today. Medical question — flagged to staff.',
    transcript: [
      { from: 'patient', text: 'Mere bete ka daant toot gaya hai, kya X-ray zaroori hai? Wo 6 saal ka hai.' },
      { from: 'ai', text: 'Main doctor ki jagah medical advice nahi de sakti, lekin main aapko abhi clinic staff se connect karwa deti hoon. Aaj 10 baje ke baad ka slot hold kar rahi hoon.' },
      { from: 'system', text: 'Flagged to staff · Medical question · Slot held for 2 hours' },
    ],
  },
  {
    id: 'c4',
    name: 'Sana Sheikh',
    phone: '@sana.sh',
    channel: 'instagram',
    time: '11:20 PM',
    afterHours: true,
    language: 'English',
    outcome: 'booked',
    summary: 'Saw acne reel, asked for consultation — booked 12:00 PM with Dr. Farah Khan.',
    transcript: [
      { from: 'patient', text: 'Saw your reel on acne scars. Does Dr Farah do consultations on weekdays?' },
      { from: 'ai', text: 'Yes! Dr. Farah Khan consults Mon–Sat. Consultation is ₹800. Tomorrow 12:00 PM is open — want it?' },
      { from: 'patient', text: 'Perfect' },
      { from: 'system', text: 'Booked · 12:00 PM · Dr. Farah Khan · Moved to WhatsApp for reminders' },
    ],
  },
  {
    id: 'c5',
    name: 'Rahul Gupta',
    phone: '+91 99•••• 2093',
    channel: 'whatsapp',
    time: '9:10 AM',
    afterHours: false,
    language: 'Hinglish',
    outcome: 'rescheduled',
    summary: 'Moved extraction from today to tomorrow 10:00 AM.',
    transcript: [
      { from: 'patient', text: 'Aaj office mein meeting aa gayi, appointment kal kar sakte hain?' },
      { from: 'ai', text: 'Bilkul. Kal 10:00 AM Dr. Karan Mehta ke saath chalega?' },
      { from: 'patient', text: 'Haan perfect' },
      { from: 'system', text: 'Rescheduled · Tomorrow 10:00 AM · Today’s slot released' },
    ],
  },
  {
    id: 'c6',
    name: 'Kiran Patel',
    phone: '+91 98•••• 6612',
    channel: 'call',
    time: '9:35 AM',
    afterHours: false,
    language: 'English',
    outcome: 'answered',
    summary: 'Asked about parking and whether the clinic takes card payments. Answered.',
    transcript: [
      { from: 'patient', text: 'Is there parking near the clinic? And do you take cards?' },
      { from: 'ai', text: 'Yes — there’s free parking in the building basement, and we accept cards, UPI and cash.' },
      { from: 'system', text: 'Answered · No booking needed' },
    ],
  },
  {
    id: 'c7',
    name: 'Neha Agarwal',
    phone: '+91 96•••• 0457',
    channel: 'whatsapp',
    time: '10:48 AM',
    afterHours: false,
    language: 'English',
    outcome: 'needs-you',
    summary: 'Unhappy with billing on last visit. Complaint — flagged to clinic manager.',
    transcript: [
      { from: 'patient', text: 'I was charged ₹2,000 extra last week and nobody explained why.' },
      { from: 'ai', text: 'I’m sorry about that, Neha. I’ve passed this to our clinic manager, who will call you back today.' },
      { from: 'system', text: 'Flagged to staff · Billing complaint' },
    ],
  },
]

/* The live "simulate a call" script. Branches when the clinic is closed today. */
export const simulationScript = (closedToday) => {
  const slotDay = closedToday ? 1 : 0
  const slotTime = closedToday ? '10:30' : '18:30'
  const whenHi = closedToday ? 'kal subah 10:30' : 'aaj shaam 6:30'
  const whenEn = closedToday ? 'Tomorrow 10:30 AM' : 'Today 6:30 PM'
  return {
    caller: { name: 'Rohit Verma', phone: '+91 98•••• 3307' },
    slot: { day: slotDay, time: slotTime, doctor: 'Dr. Karan Mehta', treatment: 'Toothache consultation' },
    whenEn,
    lines: [
      { from: 'patient', text: 'Hello, kya dentist available hai? Daant mein bahut dard ho raha hai.' },
      {
        from: 'ai',
        text: closedToday
          ? `Namaste, Smile Studio Dental. Aaj clinic band hai, lekin ${whenHi} baje Dr. Karan Mehta ka slot khaali hai. Book kar doon?`
          : `Namaste, Smile Studio Dental. Sorry to hear that — ${whenHi} baje Dr. Karan Mehta ka slot khaali hai. Book kar doon?`,
      },
      { from: 'patient', text: 'Haan theek hai. Consultation ka kitna charge hai?' },
      { from: 'ai', text: 'Consultation ₹500 hai. X-ray zaroori hua toh ₹300 extra. Aapka naam bata dijiye?' },
      { from: 'patient', text: 'Rohit Verma.' },
      { from: 'ai', text: `Done, Rohit ji — ${whenHi}, Dr. Karan Mehta. WhatsApp pe confirmation aur location bhej rahi hoon.` },
    ],
  }
}
