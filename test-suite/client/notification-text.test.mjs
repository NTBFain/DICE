import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getNotificationText } from '../../frontend/src/lib/notificationText.ts';
const messages = Object.fromEntries(['en','th'].map(locale=>[locale,JSON.parse(fs.readFileSync(new URL(`../../frontend/messages/${locale}.json`,import.meta.url),'utf8')).NotificationCopy]));
const render = locale => (key, values = {}) => {
  assert.equal(typeof messages[locale][key], 'string', `Missing ${locale}.${key}`);
  return messages[locale][key].replace(/''/g,"'").replace(/\{(\w+)\}/g, (_,field)=>{assert.ok(field in values,field);return String(values[field]);});
};

test('payment and auction templates render real English/Thai copy without changing amounts',()=>{
  const notice={title:'Payment Approved',message:"Your payment for 'มัดจำ 50%' has been approved."};
  assert.deepEqual(getNotificationText(notice,render('en')),notice);
  assert.deepEqual(getNotificationText(notice,render('th')),{title:'อนุมัติการชำระเงินแล้ว',message:'อนุมัติการชำระเงินสำหรับ “มัดจำ 50%” แล้ว'});
  const won=getNotificationText({title:'You Won the Auction!',message:"Congratulations! You won 'Blue OC' with a bid of ฿50.25."},render('th'));
  assert.ok(won.message.includes('50.25'));assert.ok(won.message.includes('Blue OC'));
});

test('all recognized platform templates render both languages',()=>{
  const notices=[
    ['Order Status Updated',"Your order 'A' status changed to COLORING"],
    ['New Invoice Issued',"New invoice 'Deposit' issued for your order 'A'"],
    ['Payment Uploaded',"Client uploaded payment slip for invoice 'Deposit' in order 'A'"],
    ['Revision Requested',"Client requested a revision for order 'A'"],
    ['Revision Resolved',"Feedback for 'A' has been addressed."],
    ['New File Uploaded',"A new FINAL file has been uploaded for your order 'A'."],
    ['Outbid Alert!',"You have been outbid on auction 'A' with ฿25.50."],
    ['Auction Ended',"The auction for 'A' has ended."],
    ['Auto-Buy Successful!',"You successfully purchased 'A' via Auto-Buy for ฿50.25."],
    ['📥 คุณได้รับคำขอคอมมิชชันใหม่!','ผู้ใช้ QA Client ส่งบรีฟขอจ้างงาน [Blue OC] ราคา ฿1,234.50'],
    ['🎉 ศิลปินตอบรับคำขอคอมมิชชันของคุณแล้ว!','ออเดอร์ #25 ถูกสร้างขึ้นแล้ว โปรดตรวจสอบและดำเนินการชำระเงินมัดจำ'],
    ['คำขอคอมมิชชันของคุณถูกปฏิเสธ','ศิลปินไม่สามารถรับงานได้: Artist-authored reason'],
    ['🎨 คิวงานคอมมิชชันเปิดรับแล้ว!','ศิลปิน @qa_artist เปิดรับฟอร์มสำหรับ [Blue OC] แล้ว! (สล็อตว่าง: 3 คิว)']
  ];
  for(const locale of ['en','th']) for(const [title,message] of notices){
    const result=getNotificationText({title,message},render(locale));
    assert.ok(result.title && result.message);assert.ok(!result.message.includes('undefined'));
    if(locale==='en' && title.includes('คอมมิชชัน'))assert.ok(!/[ก-๙]/.test(result.title));
    if(locale==='th' && title==='Order Status Updated')assert.ok(result.message.includes('กำลังลงสี'));
  }
});

test('quotes, newlines and artist-authored text remain intact',()=>{
  const order="Mina's OC\nชุดสีน้ำเงิน";
  const result=getNotificationText({title:'Revision Requested',message:`Client requested a revision for order '${order}'`},render('th'));
  assert.ok(result.message.includes(order));
});

test('chat body stays verbatim while its platform heading localizes',()=>{
  const message='Client: keep Payment Approved and คอมมิชชัน exactly as typed.';
  const result=getNotificationText({title:"New Message in 'Mina\'s OC'",message},render('th'));
  assert.equal(result.message,message);assert.equal(result.title,'ข้อความใหม่ใน “Mina\'s OC”');
});

test('unknown/custom notices and unfamiliar formats are preserved',()=>{
  for(const notice of [{title:'Studio news',message:'Artist-authored announcement'},{title:'Payment Approved',message:'Custom text outside the platform template'}]){
    assert.deepEqual(getNotificationText(notice,render('th')),notice);
  }
});
