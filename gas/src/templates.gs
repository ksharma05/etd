function buildConfirmationEmailHtml_(params) {
  var leadName = escapeHtml_(params.leadName || "there");
  var service = escapeHtml_(params.service || "Consultation");
  var dateDisplay = escapeHtml_(params.dateDisplay || "");
  var timeDisplay = escapeHtml_(params.timeDisplay || "");
  var meetUrl = params.meetUrl || "";
  var eventLink = params.eventLink || "";
  var fromName = escapeHtml_(params.fromName || "Exponent Tech and Digital");
  var companyEmail = escapeHtml_(params.companyEmail || "");

  var meetSection = meetUrl
    ? '<p style="margin:16px 0;"><a href="' +
      meetUrl +
      '" style="display:inline-block;background:#1f2937;color:#ffffff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600;">Join Google Meet</a></p>'
    : '<p style="margin:16px 0;">Meeting link will be shared shortly.</p>';

  var calendarSection = eventLink
    ? '<p style="margin:8px 0 0;"><a href="' + eventLink + '" style="color:#374151;">Open calendar event</a></p>'
    : "";

  return (
    '<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;color:#111827;">' +
    '<h2 style="margin:0 0 12px;">Your consultation is confirmed</h2>' +
    "<p>Hello " +
    leadName +
    ",</p>" +
    "<p>Thanks for booking a consultation with " +
    fromName +
    ". We have reserved your slot.</p>" +
    '<div style="margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">' +
    '<p style="margin:0 0 8px;"><strong>Service:</strong> ' +
    service +
    "</p>" +
    '<p style="margin:0 0 8px;"><strong>Date:</strong> ' +
    dateDisplay +
    "</p>" +
    '<p style="margin:0;"><strong>Time:</strong> ' +
    timeDisplay +
    "</p>" +
    "</div>" +
    meetSection +
    calendarSection +
    '<p style="margin-top:24px;">If you need to reschedule, reply to this email at <a href="mailto:' +
    companyEmail +
    '">' +
    companyEmail +
    "</a>.</p>" +
    '<p style="margin-top:24px;">Regards,<br />' +
    fromName +
    "</p>" +
    "</div>"
  );
}

function escapeHtml_(value) {
  var stringValue = String(value || "");
  return stringValue
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

