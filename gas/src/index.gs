var RESPONSE_CODES = {
  SUCCESS: "SUCCESS",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  INVALID_JSON: "INVALID_JSON",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFIG_ERROR: "CONFIG_ERROR",
  DUPLICATE_REQUEST: "DUPLICATE_REQUEST",
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",
  CALENDAR_ERROR: "CALENDAR_ERROR",
  SHEET_ERROR: "SHEET_ERROR",
  EMAIL_ERROR: "EMAIL_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

function doGet(e) {
  try {
    var config = readConfig_();
    if (!config.ok) {
      return jsonResponse_(false, RESPONSE_CODES.CONFIG_ERROR, config.message, null);
    }

    var startParam = e && e.parameter ? e.parameter.start : null;
    var endParam = e && e.parameter ? e.parameter.end : null;

    if (!startParam || !endParam) {
      return jsonResponse_(false, RESPONSE_CODES.VALIDATION_ERROR, "Missing 'start' and 'end' query parameters.", null);
    }

    if (!isIsoDate_(startParam) || !isIsoDate_(endParam)) {
      return jsonResponse_(false, RESPONSE_CODES.VALIDATION_ERROR, "Invalid date format for 'start' or 'end'.", null);
    }

    var events = Calendar.Events.list(config.data.targetCalendarId, {
      timeMin: startParam,
      timeMax: endParam,
      singleEvents: true,
      showDeleted: false,
      maxResults: 200,
      orderBy: "startTime",
    });

    var takenSlots = [];
    var items = (events && events.items) || [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item && item.status !== "cancelled" && item.start && item.start.dateTime) {
        takenSlots.push(item.start.dateTime);
      }
    }

    return jsonResponse_(true, RESPONSE_CODES.SUCCESS, "Slot availability fetched.", { takenSlots: takenSlots });
  } catch (error) {
    return jsonResponse_(false, RESPONSE_CODES.INTERNAL_ERROR, "Unexpected error fetching availability.", { error: String(error) });
  }
}

function doPost(e) {
  try {
    var payloadResult = parseJsonBody_(e);
    if (!payloadResult.ok) {
      return jsonResponse_(false, payloadResult.code, payloadResult.message, null);
    }

    var validation = validatePayload_(payloadResult.data);
    if (!validation.ok) {
      return jsonResponse_(false, RESPONSE_CODES.VALIDATION_ERROR, validation.message, validation.errors);
    }

    var payload = validation.data;
    var config = readConfig_();
    if (!config.ok) {
      return jsonResponse_(false, RESPONSE_CODES.CONFIG_ERROR, config.message, null);
    }

    var duplicate = findDuplicateRequest_(payload, config.data);
    if (!duplicate.ok) {
      return jsonResponse_(false, RESPONSE_CODES.SHEET_ERROR, duplicate.message, duplicate.details || null);
    }
    if (duplicate.duplicate) {
      return jsonResponse_(false, RESPONSE_CODES.DUPLICATE_REQUEST, "Duplicate booking request detected.", duplicate.data || null);
    }

    var slotCheck = checkSlotAvailability_(payload, config.data);
    if (!slotCheck.ok) {
      return jsonResponse_(false, RESPONSE_CODES.CALENDAR_ERROR, slotCheck.message, slotCheck.details || null);
    }
    if (!slotCheck.available) {
      return jsonResponse_(false, RESPONSE_CODES.SLOT_UNAVAILABLE, "Selected slot is already booked.", slotCheck.data || null);
    }

    var booking = createCalendarBooking_(payload, config.data);
    if (!booking.ok) {
      return jsonResponse_(false, RESPONSE_CODES.CALENDAR_ERROR, booking.message, booking.details || null);
    }

    var rowWrite = appendLeadRow_(payload, booking.data, config.data);
    if (!rowWrite.ok) {
      return jsonResponse_(false, RESPONSE_CODES.SHEET_ERROR, rowWrite.message, rowWrite.details || null);
    }

    var emailSend = sendConfirmationEmail_(payload, booking.data, config.data);
    if (!emailSend.ok) {
      return jsonResponse_(false, RESPONSE_CODES.EMAIL_ERROR, emailSend.message, emailSend.details || null);
    }

    return jsonResponse_(true, RESPONSE_CODES.SUCCESS, "Consultation booked successfully.", {
      eventId: booking.data.eventId,
      meetUrl: booking.data.meetUrl,
      slotStartIso: payload.slot.startIso,
      slotEndIso: payload.slot.endIso,
      leadEmail: payload.contact.email,
      calendarId: config.data.targetCalendarId,
    });
  } catch (error) {
    return jsonResponse_(false, RESPONSE_CODES.INTERNAL_ERROR, "Unexpected server error.", {
      error: String(error),
    });
  }
}

function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return { ok: false, code: RESPONSE_CODES.INVALID_JSON, message: "Request body is missing." };
  }

  try {
    var data = JSON.parse(e.postData.contents);
    return { ok: true, data: data };
  } catch (error) {
    return { ok: false, code: RESPONSE_CODES.INVALID_JSON, message: "Malformed JSON payload." };
  }
}

function validatePayload_(payload) {
  var errors = [];
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "Payload must be an object.", errors: ["payload"] };
  }

  if (!payload.service || typeof payload.service !== "string") {
    errors.push("service");
  }
  if (!payload.budget || typeof payload.budget !== "string") {
    errors.push("budget");
  }
  if (!payload.timeline || typeof payload.timeline !== "string") {
    errors.push("timeline");
  }
  if (!payload.goals || typeof payload.goals !== "string") {
    errors.push("goals");
  }
  if (!payload.contact || typeof payload.contact !== "object") {
    errors.push("contact");
  } else {
    if (!payload.contact.name || typeof payload.contact.name !== "string") {
      errors.push("contact.name");
    }
    if (!payload.contact.email || !isEmail_(payload.contact.email)) {
      errors.push("contact.email");
    }
    if (!payload.contact.company || typeof payload.contact.company !== "string") {
      errors.push("contact.company");
    }
  }
  if (!payload.slot || typeof payload.slot !== "object") {
    errors.push("slot");
  } else {
    if (!isIsoDate_(payload.slot.startIso)) {
      errors.push("slot.startIso");
    }
    if (!isIsoDate_(payload.slot.endIso)) {
      errors.push("slot.endIso");
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      message: "Payload validation failed.",
      errors: errors,
    };
  }

  var start = new Date(payload.slot.startIso);
  var end = new Date(payload.slot.endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return {
      ok: false,
      message: "Invalid booking slot.",
      errors: ["slot.startIso", "slot.endIso"],
    };
  }

  return {
    ok: true,
    data: {
      service: payload.service,
      budget: payload.budget,
      timeline: payload.timeline,
      goals: payload.goals,
      notes: payload.notes || "",
      slot: {
        startIso: payload.slot.startIso,
        endIso: payload.slot.endIso,
      },
      contact: {
        name: payload.contact.name,
        email: payload.contact.email,
        company: payload.contact.company,
        phone: payload.contact.phone || "",
      },
    },
  };
}

function readConfig_() {
  var scriptProps = PropertiesService.getScriptProperties();
  var targetCalendarId = scriptProps.getProperty("TARGET_CALENDAR_ID");
  var crmSpreadsheetId = scriptProps.getProperty("CRM_SPREADSHEET_ID");
  var crmSheetName = scriptProps.getProperty("CRM_SHEET_NAME") || "Leads CRM";
  var fromName = scriptProps.getProperty("FROM_NAME") || "Exponent Tech and Digital";
  var companyEmail = scriptProps.getProperty("COMPANY_EMAIL") || Session.getActiveUser().getEmail();
  var timezone = scriptProps.getProperty("TIMEZONE") || Session.getScriptTimeZone();

  if (!targetCalendarId || !crmSpreadsheetId) {
    return {
      ok: false,
      message: "Missing required script properties: TARGET_CALENDAR_ID and CRM_SPREADSHEET_ID.",
    };
  }

  return {
    ok: true,
    data: {
      targetCalendarId: targetCalendarId,
      crmSpreadsheetId: crmSpreadsheetId,
      crmSheetName: crmSheetName,
      fromName: fromName,
      companyEmail: companyEmail,
      timezone: timezone,
    },
  };
}

function createCalendarBooking_(payload, config) {
  try {
    var start = new Date(payload.slot.startIso);
    var end = new Date(payload.slot.endIso);
    var summary = "Consultation: " + payload.contact.name + " (" + payload.service + ")";

    var descriptionLines = [
      "Service: " + payload.service,
      "Budget: " + payload.budget,
      "Timeline: " + payload.timeline,
      "Goals: " + payload.goals,
      "Notes: " + (payload.notes || "N/A"),
      "",
      "Lead Name: " + payload.contact.name,
      "Lead Email: " + payload.contact.email,
      "Lead Company: " + payload.contact.company,
      "Lead Phone: " + (payload.contact.phone || "N/A"),
    ];

    var eventResource = {
      summary: summary,
      description: descriptionLines.join("\n"),
      start: {
        dateTime: start.toISOString(),
        timeZone: config.timezone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: config.timezone,
      },
      attendees: [{ email: payload.contact.email }],
      conferenceData: {
        createRequest: {
          requestId: Utilities.getUuid(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    var created = Calendar.Events.insert(eventResource, config.targetCalendarId, {
      conferenceDataVersion: 1,
      sendUpdates: "all",
    });

    var meetUrl = "";
    if (created.conferenceData && created.conferenceData.entryPoints) {
      for (var i = 0; i < created.conferenceData.entryPoints.length; i++) {
        var entryPoint = created.conferenceData.entryPoints[i];
        if (entryPoint.entryPointType === "video" && entryPoint.uri) {
          meetUrl = entryPoint.uri;
          break;
        }
      }
    }

    return {
      ok: true,
      data: {
        eventId: created.id,
        meetUrl: meetUrl,
        htmlLink: created.htmlLink || "",
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: "Failed to create calendar booking.",
      details: { error: String(error) },
    };
  }
}

function appendLeadRow_(payload, booking, config) {
  try {
    var spreadsheet = SpreadsheetApp.openById(config.crmSpreadsheetId);
    var sheet = spreadsheet.getSheetByName(config.crmSheetName);
    if (!sheet) {
      return {
        ok: false,
        message: 'CRM sheet "' + config.crmSheetName + '" not found.',
      };
    }

    var createdAt = new Date();
    var row = [
      Utilities.formatDate(createdAt, config.timezone, "yyyy-MM-dd HH:mm:ss"),
      payload.contact.name,
      payload.contact.email,
      payload.contact.company,
      payload.contact.phone,
      payload.service,
      payload.budget,
      payload.timeline,
      payload.goals,
      payload.notes,
      payload.slot.startIso,
      payload.slot.endIso,
      booking.eventId,
      booking.meetUrl,
      booking.htmlLink,
      getRequestFingerprint_(payload),
    ];

    sheet.appendRow(row);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: "Failed to append lead row to spreadsheet.",
      details: { error: String(error) },
    };
  }
}

function findDuplicateRequest_(payload, config) {
  try {
    var spreadsheet = SpreadsheetApp.openById(config.crmSpreadsheetId);
    var sheet = spreadsheet.getSheetByName(config.crmSheetName);
    if (!sheet) {
      return {
        ok: false,
        message: 'CRM sheet "' + config.crmSheetName + '" not found.',
      };
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { ok: true, duplicate: false };
    }

    var startRow = Math.max(2, lastRow - 300);
    var numRows = lastRow - startRow + 1;
    var numCols = Math.max(sheet.getLastColumn(), 16);
    var rows = sheet.getRange(startRow, 1, numRows, numCols).getValues();

    var incomingEmail = normalizeEmail_(payload.contact.email);
    var incomingService = String(payload.service || "");
    var incomingStart = String(payload.slot.startIso || "");
    var incomingEnd = String(payload.slot.endIso || "");
    var incomingFingerprint = getRequestFingerprint_(payload);

    for (var i = rows.length - 1; i >= 0; i--) {
      var row = rows[i];
      var rowEmail = normalizeEmail_(row[2]);
      var rowService = String(row[5] || "");
      var rowStart = String(row[10] || "");
      var rowEnd = String(row[11] || "");
      var rowEventId = String(row[12] || "");
      var rowMeetUrl = String(row[13] || "");
      var rowFingerprint = String(row[15] || "");

      var fingerprintMatch = rowFingerprint && rowFingerprint === incomingFingerprint;
      var semanticMatch =
        rowEmail === incomingEmail && rowService === incomingService && rowStart === incomingStart && rowEnd === incomingEnd;

      if (fingerprintMatch || semanticMatch) {
        return {
          ok: true,
          duplicate: true,
          data: {
            existingEventId: rowEventId,
            existingMeetUrl: rowMeetUrl,
            slotStartIso: rowStart,
            slotEndIso: rowEnd,
          },
        };
      }
    }

    return { ok: true, duplicate: false };
  } catch (error) {
    return {
      ok: false,
      message: "Failed to check duplicate requests.",
      details: { error: String(error) },
    };
  }
}

function checkSlotAvailability_(payload, config) {
  try {
    var slotEvents = Calendar.Events.list(config.targetCalendarId, {
      timeMin: payload.slot.startIso,
      timeMax: payload.slot.endIso,
      singleEvents: true,
      showDeleted: false,
      maxResults: 5,
      orderBy: "startTime",
    });

    var items = slotEvents.items || [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item && item.status !== "cancelled") {
        return {
          ok: true,
          available: false,
          data: {
            conflictingEventId: item.id || "",
            conflictingSummary: item.summary || "",
          },
        };
      }
    }

    return { ok: true, available: true };
  } catch (error) {
    return {
      ok: false,
      message: "Failed to verify slot availability.",
      details: { error: String(error) },
    };
  }
}

function sendConfirmationEmail_(payload, booking, config) {
  try {
    var startDate = new Date(payload.slot.startIso);
    var endDate = new Date(payload.slot.endIso);
    var dateDisplay = Utilities.formatDate(startDate, config.timezone, "EEE, MMM d, yyyy");
    var timeDisplay =
      Utilities.formatDate(startDate, config.timezone, "hh:mm a") +
      " - " +
      Utilities.formatDate(endDate, config.timezone, "hh:mm a z");

    var subject = "Consultation confirmed with Exponent Tech and Digital";
    var htmlBody = buildConfirmationEmailHtml_({
      leadName: payload.contact.name,
      service: payload.service,
      dateDisplay: dateDisplay,
      timeDisplay: timeDisplay,
      meetUrl: booking.meetUrl,
      eventLink: booking.htmlLink,
      fromName: config.fromName,
      companyEmail: config.companyEmail,
    });

    MailApp.sendEmail({
      to: payload.contact.email,
      subject: subject,
      htmlBody: htmlBody,
      name: config.fromName,
      replyTo: config.companyEmail,
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: "Failed to send confirmation email.",
      details: { error: String(error) },
    };
  }
}

function jsonResponse_(ok, code, message, data) {
  var response = {
    ok: ok,
    code: code,
    message: message,
    data: data || null,
    timestamp: new Date().toISOString(),
  };

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function isEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function isIsoDate_(value) {
  if (!value || typeof value !== "string") {
    return false;
  }
  var date = new Date(value);
  return !isNaN(date.getTime());
}

function normalizeEmail_(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getRequestFingerprint_(payload) {
  var raw = [
    normalizeEmail_(payload.contact.email),
    String(payload.service || "").trim(),
    String(payload.slot.startIso || "").trim(),
    String(payload.slot.endIso || "").trim(),
    String(payload.budget || "").trim(),
    String(payload.timeline || "").trim(),
    String(payload.goals || "").trim(),
  ].join("|");

  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return Utilities.base64EncodeWebSafe(digest);
}

