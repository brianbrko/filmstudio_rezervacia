import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const EMAIL_FROM = process.env.CONTACT_FROM_EMAIL || 'Film Studio <noreply@filmstudiorezervacie.online>';
const ADMIN_EMAIL = process.env.CONTACT_TO_EMAIL || 'admin@filmstudiorezervacie.online';

export interface ReservationEmailData {
  customerName: string;
  customerEmail: string;
  serviceTitle: string;
  servicePrice: number;
  duration: number;
  employeeName: string;
  reservationDate: string;
  reservationTime: string;
  status: string;
}

export async function sendReservationConfirmation(data: ReservationEmailData) {
  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.customerEmail,
      subject: `Potvrdenie rezervácie – Pixel Room`,
      html: getReservationEmailTemplate(data),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
}

export async function sendAdminNotification(data: ReservationEmailData) {
  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: ADMIN_EMAIL,
      subject: `Nova rezervacia – ${data.customerName} – ${data.serviceTitle}`,
      html: getAdminEmailTemplate(data),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Admin email sending failed:', error);
    return { success: false, error };
  }
}

function getReservationEmailTemplate(data: ReservationEmailData): string {
  const timeFormatted = data.reservationTime.slice(0, 5);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f7; color: #333;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 30px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; font-size: 26px; color: #ffffff; font-weight: 700;">Pixel Room</h1>
                    <p style="margin: 8px 0 0; font-size: 15px; color: rgba(255,255,255,0.85);">Potvrdenie rezervacie</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="background-color: #ffffff; padding: 35px 30px;">

                    <p style="font-size: 16px; margin: 0 0 20px;">Dobry den, <strong>${data.customerName}</strong>,</p>
                    <p style="font-size: 15px; margin: 0 0 25px; color: #555;">vasa rezervacia bola uspesne potvrdena. Tu su detaily:</p>

                    <!-- Detail table -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                      <tr>
                        <td style="padding: 14px 16px; background-color: #faf5ff; border-left: 4px solid #7c3aed; font-weight: 600; color: #7c3aed; font-size: 14px;">Sluzba</td>
                        <td style="padding: 14px 16px; background-color: #faf5ff; text-align: right; font-size: 14px;">${data.serviceTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; font-weight: 600; color: #7c3aed; font-size: 14px;">Datum</td>
                        <td style="padding: 14px 16px; text-align: right; font-size: 14px;">${formatDate(data.reservationDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; background-color: #faf5ff; border-left: 4px solid #7c3aed; font-weight: 600; color: #7c3aed; font-size: 14px;">Cas</td>
                        <td style="padding: 14px 16px; background-color: #faf5ff; text-align: right; font-size: 14px; font-weight: 700;">${timeFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; font-weight: 600; color: #7c3aed; font-size: 14px;">Trvanie</td>
                        <td style="padding: 14px 16px; text-align: right; font-size: 14px;">${data.duration} min</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; background-color: #faf5ff; border-left: 4px solid #7c3aed; font-weight: 600; color: #7c3aed; font-size: 14px;">Cena</td>
                        <td style="padding: 14px 16px; background-color: #faf5ff; text-align: right; font-size: 14px; font-weight: 700;">${data.servicePrice.toFixed(2)} &euro;</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; font-weight: 600; color: #7c3aed; font-size: 14px;">Atelier</td>
                        <td style="padding: 14px 16px; text-align: right; font-size: 14px;">${data.employeeName}</td>
                      </tr>
                    </table>

                    <!-- Status badge -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                      <tr>
                        <td align="center">
                          <span style="display: inline-block; padding: 10px 24px; background-color: #10b981; color: #ffffff; border-radius: 6px; font-weight: 700; font-size: 14px;">${getStatusInSlovak(data.status)}</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

                    <!-- Info -->
                    <p style="font-size: 14px; color: #555; margin: 0 0 8px;"><strong>Prosime, pridte 10 minut pred zaciatkom vasej rezervacie.</strong></p>
                    <p style="font-size: 14px; color: #555; margin: 0 0 8px;">Ak potrebujete zmenit alebo zrusit rezervaciu, kontaktujte nas minimalne 24 hodin vopred.</p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

                    <!-- Contact -->
                    <p style="font-size: 14px; color: #555; margin: 0 0 4px;"><strong>Pixel Room</strong></p>
                    <p style="font-size: 13px; color: #888; margin: 0 0 4px;">Web: <a href="https://www.filmstudiorezervacie.online" style="color: #7c3aed; text-decoration: none;">www.filmstudiorezervacie.online</a></p>
                    <p style="font-size: 13px; color: #888; margin: 0;">Email: <a href="mailto:${ADMIN_EMAIL}" style="color: #7c3aed; text-decoration: none;">${ADMIN_EMAIL}</a></p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">Tesime sa na vas!</p>
                    <p style="margin: 6px 0 0; font-size: 11px; color: #d1d5db;">Toto je automaticka sprava. Prosim, neodpovedajte na tento email.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function getAdminEmailTemplate(data: ReservationEmailData): string {
  const timeFormatted = data.reservationTime.slice(0, 5);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f7; color: #333;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 30px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; font-size: 26px; color: #ffffff; font-weight: 700;">Pixel Room</h1>
                    <p style="margin: 8px 0 0; font-size: 15px; color: rgba(255,255,255,0.85);">Nova rezervacia</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="background-color: #ffffff; padding: 35px 30px;">

                    <!-- Customer info -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; background-color: #faf5ff; border-left: 4px solid #7c3aed; border-radius: 4px;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7c3aed; font-weight: 600;">Zakaznik</p>
                          <p style="margin: 0 0 2px; font-size: 18px; font-weight: 700; color: #1e293b;">${data.customerName}</p>
                          <p style="margin: 0; font-size: 14px; color: #64748b;">${data.customerEmail}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Detail table -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                      <tr>
                        <td style="padding: 14px 16px; background-color: #faf5ff; border-left: 4px solid #7c3aed; font-weight: 600; color: #7c3aed; font-size: 14px; width: 40%;">Sluzba</td>
                        <td style="padding: 14px 16px; background-color: #faf5ff; font-size: 14px; font-weight: 600; color: #1e293b;">${data.serviceTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; font-weight: 600; color: #7c3aed; font-size: 14px;">Cena</td>
                        <td style="padding: 14px 16px; font-size: 14px; color: #1e293b;">${data.servicePrice.toFixed(2)} &euro;</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; background-color: #faf5ff; border-left: 4px solid #7c3aed; font-weight: 600; color: #7c3aed; font-size: 14px;">Trvanie</td>
                        <td style="padding: 14px 16px; background-color: #faf5ff; font-size: 14px; color: #1e293b;">${data.duration} min</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; font-weight: 600; color: #7c3aed; font-size: 14px;">Datum a cas</td>
                        <td style="padding: 14px 16px; font-size: 14px; color: #1e293b; font-weight: 700;">${formatDate(data.reservationDate)} o ${timeFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; background-color: #faf5ff; border-left: 4px solid #7c3aed; font-weight: 600; color: #7c3aed; font-size: 14px;">Atelier</td>
                        <td style="padding: 14px 16px; background-color: #faf5ff; font-size: 14px; color: #1e293b;">${data.employeeName}</td>
                      </tr>
                    </table>

                    <!-- Status badge -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                      <tr>
                        <td align="center">
                          <span style="display: inline-block; padding: 10px 24px; background-color: #10b981; color: #ffffff; border-radius: 6px; font-weight: 700; font-size: 14px;">${getStatusInSlovak(data.status)}</span>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">Pixel Room &middot; Rezervacny system</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ['nedela', 'pondelok', 'utorok', 'streda', 'stvrtok', 'piatok', 'sobota'];
  const months = ['januara', 'februara', 'marca', 'aprila', 'maja', 'juna', 'jula', 'augusta', 'septembra', 'oktobra', 'novembra', 'decembra'];

  return `${days[date.getDay()]} ${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getStatusInSlovak(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Caka na potvrdenie',
    confirmed: 'Potvrdena',
    cancelled: 'Zrusena',
  };
  return statusMap[status] || status;
}
