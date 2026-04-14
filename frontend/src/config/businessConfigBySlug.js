export const businessConfigBySlug = {
  "urban-district-barber": {
    id: "barberia-james",
    name: "Urban District Barber",
    subtitle: "Cortes de cabello y barba profesionales",

    phone: "+569 3216 7325",
    hours: "Lunes a sábado: 10:30 a 15:00 y 16:00 a 21:00",
    location: "Coquimbo",
    address: "Aníbal Pinto 1601, Coquimbo",

    image: "/james-hero.jpeg",
    logo: "/logo-james.jpg",

    description:
      "Reserva tu cita online y redefine tu imagen con cortes de cabello y barba profesionales.",

    whatsappLabel: "Contáctanos por WhatsApp",
    mapLink: "https://maps.google.com/?q=An%C3%ADbal+Pinto+1601,+Coquimbo",
    mapEmbedUrl:
      "https://www.google.com/maps?q=Anibal+Pinto+1601+Coquimbo&output=embed",

    bookingTitle: "Reserva tu hora 💈",
    adminTitle: "Agenda Barbería 💈",
    bookingPanelTitle: "Agenda tu hora",
    bookingPanelDescription:
      "Elige tu barbero, selecciona un bloque disponible y confirma tu reserva en segundos.",
    calendarHelpText:
      "Para reservar, primero selecciona un bloque disponible en el calendario.",
    resourceLabelSingle: "Barbero",
    resourceLabelPlural: "Barberos",
    serviceLabel: "servicio",
    clientNamePlaceholder: "Nombre cliente",
    clientPhonePlaceholder: "Teléfono cliente",
    submitButtonLabel: "Confirmar reserva",
    submittingLabel: "Reservando...",
    updateButtonLabel: "Actualizar cita",
    updatingLabel: "Actualizando...",
    cancelEditLabel: "Cancelar edición",
    createButtonLabel: "Crear cita",
    creatingLabel: "Creando...",
    newItemTitle: "Nueva cita",
    editItemTitle: "Editar cita",
    whatsappButtonLabel: "Abrir WhatsApp",
    resourceSelectedLabel: "Barbero seleccionado",
    resourceSelectPrompt: "Selecciona un barbero arriba",
    resourceSelectOption: "Selecciona un barbero",
    serviceSelectOption: "Selecciona un servicio",

    barbers: ["James", "Jesús"],

    phones: {
      James: "56988287547",
      Jesús: "56957265409",
    },

    services: [
      "Corte tradicional ($8.000)",
      "Degradado premium ($10.000)",
      "Corte + barba premium ($15.000)",
      "Perfilado de cejas ($2.000)",
      "Servicio completo ($17.000)",
    ],

    scheduleSlots: ["10:30", "11:30", "12:30", "13:30", "14:30", "16:00", "17:00", "18:00", "19:00", "20:00"],

    professionals: [
      { name: "James", image: "/James.jpeg" },
      { name: "Jesús", image: "/Jesus.jpeg" },
    ],
  },

  "barberia-junior": {
    id: "barberia-junior",
    name: "Barbería Junior",
    subtitle: "Cortes clásicos y modernos",
    phone: "+56 9 1234 5678",
    hours: "Próximamente",
    location: "La Serena",
    address: "Dirección por definir",
    image: "/james-hero.jpeg",
    logo: "/logo-james.jpg",
    description:
      "Agenda tu hora en Barbería Junior y disfruta de un servicio profesional.",
    whatsappLabel: "Contáctanos por WhatsApp",
    mapLink: "https://maps.google.com",
    mapEmbedUrl:
      "https://www.google.com/maps?q=La+Serena&output=embed",

    bookingTitle: "Reserva tu hora 💈",
    adminTitle: "Agenda Barbería 💈",
    bookingPanelTitle: "Agenda tu hora",
    bookingPanelDescription:
      "Elige tu barbero, selecciona un bloque disponible y confirma tu reserva en segundos.",
    calendarHelpText:
      "Para reservar, primero selecciona un bloque disponible en el calendario.",
    resourceLabelSingle: "Barbero",
    resourceLabelPlural: "Barberos",
    serviceLabel: "servicio",
    clientNamePlaceholder: "Nombre cliente",
    clientPhonePlaceholder: "Teléfono cliente",
    submitButtonLabel: "Confirmar reserva",
    submittingLabel: "Reservando...",
    updateButtonLabel: "Actualizar cita",
    updatingLabel: "Actualizando...",
    cancelEditLabel: "Cancelar edición",
    createButtonLabel: "Crear cita",
    creatingLabel: "Creando...",
    newItemTitle: "Nueva cita",
    editItemTitle: "Editar cita",
    whatsappButtonLabel: "Abrir WhatsApp",
    resourceSelectedLabel: "Barbero seleccionado",
    resourceSelectPrompt: "Selecciona un barbero arriba",
    resourceSelectOption: "Selecciona un barbero",
    serviceSelectOption: "Selecciona un servicio",

    barbers: ["Junior"],

    phones: {
      Junior: "56912345678",
    },

    services: [
      "Corte básico ($6.000)",
      "Corte + barba ($10.000)",
    ],

    scheduleSlots: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],

    professionals: [
      { name: "Junior", image: "/james-hero.jpeg" },
    ],
  },

  "giocata": {
    id: "giocata",
    name: "Canchas Giocata",
    subtitle: "Arriendo de canchas de fútbol",
    phone: "Por definir",
    hours: "Lun a Dom, 20:00 a 22:00",
    location: "La Serena",
    address: "Hortensia Bustamante 52",
    image: "/giocata-hero.jpg",
    logo: "/giocata-logo.jpg",
    description:
      "Reserva tu cancha online en La Serena de forma rápida y simple. Elige la cancha, selecciona el horario disponible y confirma tu reserva fácilmente por WhatsApp.",
    whatsappLabel: "Confirma tu reserva por WhatsApp",
    mapLink: "https://maps.google.com/?q=Hortensia+Bustamante+52,+La+Serena",
    mapEmbedUrl:
      "https://www.google.com/maps?q=Hortensia+Bustamante+52+La+Serena&output=embed",

    bookingTitle: "Reserva tu cancha",
    adminTitle: "Panel de reservas",
    bookingPanelTitle: "Reserva tu cancha",
    bookingPanelDescription:
      "Elige la cancha, selecciona un bloque disponible y confirma tu reserva en segundos.",
    calendarHelpText:
      "Para reservar, primero selecciona un bloque disponible en el calendario.",
    resourceLabelSingle: "Cancha",
    resourceLabelPlural: "Canchas",
    hideResourceSelector: true,
    serviceLabel: "tipo de cancha",
    clientNamePlaceholder: "Nombre cliente",
    clientPhonePlaceholder: "Teléfono cliente",
    submitButtonLabel: "Confirmar reserva",
    submittingLabel: "Reservando...",
    updateButtonLabel: "Actualizar reserva",
    updatingLabel: "Actualizando...",
    cancelEditLabel: "Cancelar edición",
    createButtonLabel: "Crear reserva",
    creatingLabel: "Creando...",
    newItemTitle: "Nueva reserva",
    editItemTitle: "Editar reserva",
    whatsappButtonLabel: "Abrir WhatsApp",
    resourceSelectedLabel: "Cancha seleccionada",
    resourceSelectPrompt: "Selecciona una cancha arriba",
    resourceSelectOption: "Selecciona una cancha",
    serviceSelectOption: "Selecciona un tipo de cancha",

    barbers: [
      "Cancha 1",
      "Cancha 2",
      "Cancha 3",
      "Cancha 4",
      "Cancha 5",
      "Cancha 6",
    ],

    phones: {
      "Cancha 1": "",
      "Cancha 2": "",
      "Cancha 3": "",
      "Cancha 4": "",
      "Cancha 5": "",
      "Cancha 6": "",
    },

    services: [
      "Fútbol 6 - Cancha 1 ($22.000)",
      "Fútbol 6 - Cancha 2 ($22.000)",
      "Fútbol 7 - Cancha 3 ($26.000)",
      "Fútbol 7 - Cancha 4 ($26.000)",
      "Fútbol 8 - Cancha 5 ($30.000)",
      "Fútbol 8 - Cancha 6 ($30.000)",
    ],

    scheduleSlots: ["20:00", "21:00", "22:00"],

    professionals: [
      { name: "Cancha 1", image: "/giocata-cancha.jpg" },
      { name: "Cancha 2", image: "/giocata-cancha.jpg" },
      { name: "Cancha 3", image: "/giocata-cancha.jpg" },
      { name: "Cancha 4", image: "/giocata-cancha.jpg" },
      { name: "Cancha 5", image: "/giocata-cancha.jpg" },
      { name: "Cancha 6", image: "/giocata-cancha.jpg" },
    ],
  },
};