type Notice = { title: string; message: string };
type Values = Record<string, string | number>;
type Translate = (key: string, values?: Values) => string;
type Template = { title: string; key: string; pattern: RegExp; fields: string[] };

// Recognize only complete platform templates. Unknown/custom notices stay verbatim.
const templates: Template[] = [
  { title: 'Order Status Updated', key: 'orderStatus', pattern: /^Your order '([\s\S]*)' status changed to (\w+)$/, fields: ['order', 'status'] },
  { title: 'New Invoice Issued', key: 'invoiceIssued', pattern: /^New invoice '([\s\S]*)' issued for your order '([\s\S]*)'$/, fields: ['invoice', 'order'] },
  { title: 'Payment Uploaded', key: 'paymentUploaded', pattern: /^Client uploaded payment slip for invoice '([\s\S]*)' in order '([\s\S]*)'$/, fields: ['invoice', 'order'] },
  { title: 'Payment Approved', key: 'paymentApproved', pattern: /^Your payment for '([\s\S]*)' has been approved\.$/, fields: ['invoice'] },
  { title: 'Revision Requested', key: 'revisionRequested', pattern: /^Client requested a revision for order '([\s\S]*)'$/, fields: ['order'] },
  { title: 'Revision Resolved', key: 'revisionResolved', pattern: /^Feedback for '([\s\S]*)' has been addressed\.$/, fields: ['order'] },
  { title: 'New File Uploaded', key: 'fileUploaded', pattern: /^A new (\w+) file has been uploaded for your order '([\s\S]*)'\.$/, fields: ['fileType', 'order'] },
  { title: 'Outbid Alert!', key: 'outbid', pattern: /^You have been outbid on auction '([\s\S]*)' with ฿([\d,.]+)\.$/, fields: ['auction', 'amount'] },
  { title: 'You Won the Auction!', key: 'auctionWon', pattern: /^Congratulations! You won '([\s\S]*)' with a bid of ฿([\d,.]+)\.$/, fields: ['auction', 'amount'] },
  { title: 'Auction Ended', key: 'auctionEnded', pattern: /^The auction for '([\s\S]*)' has ended\.$/, fields: ['auction'] },
  { title: 'Auto-Buy Successful!', key: 'autoBuy', pattern: /^You successfully purchased '([\s\S]*)' via Auto-Buy for ฿([\d,.]+)\.$/, fields: ['auction', 'amount'] },
  { title: '📥 คุณได้รับคำขอคอมมิชชันใหม่!', key: 'requestReceived', pattern: /^ผู้ใช้ ([\s\S]*) ส่งบรีฟขอจ้างงาน \[([\s\S]*)\] ราคา ฿([\d,.]+)$/, fields: ['client', 'service', 'amount'] },
  { title: '🎉 ศิลปินตอบรับคำขอคอมมิชชันของคุณแล้ว!', key: 'requestAccepted', pattern: /^ออเดอร์ #(\d+) ถูกสร้างขึ้นแล้ว โปรดตรวจสอบและดำเนินการชำระเงินมัดจำ$/, fields: ['orderId'] },
  { title: 'คำขอคอมมิชชันของคุณถูกปฏิเสธ', key: 'requestDeclined', pattern: /^ศิลปินไม่สามารถรับงานได้: ([\s\S]*)$/, fields: ['reason'] },
  { title: '🎨 คิวงานคอมมิชชันเปิดรับแล้ว!', key: 'slotsOpen', pattern: /^ศิลปิน @([a-z0-9_]+) เปิดรับฟอร์มสำหรับ \[([\s\S]*)\] แล้ว! \(สล็อตว่าง: (\d+) คิว\)$/, fields: ['handle', 'service', 'slots'] },
];

export function getNotificationText(notice: Notice, translate: Translate): Notice {
  const chat = /^New Message in '([\s\S]*)'$/.exec(notice.title);
  if (chat) return { title: translate('newMessageTitle', { order: chat[1] }), message: notice.message };
  const template = templates.find(item => item.title === notice.title);
  if (!template) return notice;
  const match = template.pattern.exec(notice.message);
  if (!match) return notice;
  const values: Values = Object.fromEntries(template.fields.map((field, i) => [field, match[i + 1]]));
  if (['PENDING','ACCEPTED','SKETCHING','COLORING','COMPLETED','CANCELLED'].includes(String(values.status))) {
    values.status = translate(`status${values.status}`);
  }
  if (['WIP','FINAL','REFERENCE'].includes(String(values.fileType))) {
    values.fileType = translate(`file${values.fileType}`);
  }
  return { title: translate(`${template.key}Title`), message: translate(`${template.key}Message`, values) };
}
