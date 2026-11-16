"""Thai QR tag 29 mobile transfer; no bank verification or expiry is implied.

Reference: Bank of Thailand Thai QR Payment Standard, 17 April 2019.
"""
import binascii
import io
import re
from decimal import Decimal, ROUND_HALF_UP
import qrcode


def to_satang(amount) -> int:
    value = Decimal(str(amount))
    if not value.is_finite() or value < 0:
        raise ValueError('Amount must be finite and non-negative')
    return int((value * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def order_fee(gross_satang: int, fee_bps: int) -> int:
    if gross_satang < 0 or not 0 <= fee_bps <= 10000:
        raise ValueError('Invalid fee inputs')
    return int((Decimal(gross_satang) * fee_bps / 10000).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def normalize_mobile(value: str) -> str:
    number = re.sub(r'[\s()-]', '', value)
    if number.startswith('+66'):
        number = '0' + number[3:]
    elif number.startswith('0066'):
        number = '0' + number[4:]
    if not re.fullmatch(r'0[689][0-9]{8}', number):
        raise ValueError('Enter a registered Thai mobile number, for example 08x-xxx-xxxx')
    return number


def tlv(tag: str, value: str) -> str:
    if len(value) > 99:
        raise ValueError('QR field exceeds its permitted length')
    return tag + f'{len(value):02d}' + value


def build_payload(mobile: str, amount_satang: int) -> str:
    if not 0 < amount_satang <= 999_999_999_999:
        raise ValueError('QR amount must be positive and fit the Thai QR transaction amount field')
    receiver = '0066' + normalize_mobile(mobile)[1:]
    account = tlv('00', 'A000000677010111') + tlv('01', receiver)
    amount = f'{amount_satang // 100}.{amount_satang % 100:02d}'
    data = tlv('00', '01') + tlv('01', '12') + tlv('29', account)
    data += tlv('53', '764') + tlv('54', amount) + tlv('58', 'TH') + '6304'
    return data + f'{binascii.crc_hqx(data.encode("ascii"), 0xFFFF):04X}'


def qr_png(payload: str) -> bytes:
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=4)
    code.add_data(payload)
    code.make(fit=True)
    result = io.BytesIO()
    code.make_image(fill_color='black', back_color='white').save(result, format='PNG')
    return result.getvalue()


def parse_tlv(value: str) -> dict[str, str]:
    fields = {}
    offset = 0
    while offset < len(value):
        if len(value)-offset < 4 or not value[offset:offset+4].isascii() or not value[offset:offset+4].isdigit():
            raise ValueError('Invalid QR field')
        tag, length = value[offset:offset+2], int(value[offset+2:offset+4])
        end = offset+4+length
        if end > len(value) or tag in fields:
            raise ValueError('Invalid or repeated QR field')
        fields[tag] = value[offset+4:end]
        offset = end
    return fields


def mobile_from_payload(payload: str) -> str:
    try:
        if not payload.isascii() or len(payload) > 2048 or payload[-8:-4] != '6304':
            raise ValueError('Invalid QR structure')
        fields = parse_tlv(payload)
        expected = f'{binascii.crc_hqx(payload[:-4].encode("ascii"), 0xFFFF):04X}'
        if fields.get('00') != '01' or fields.get('63', '').upper() != expected or fields.get('53') != '764' or fields.get('58') != 'TH':
            raise ValueError('Invalid QR checksum or currency')
        account = parse_tlv(fields.get('29', ''))
        mobile = account.get('01', '')
        if account.get('00') != 'A000000677010111' or not re.fullmatch(r'0066[689][0-9]{8}', mobile):
            raise ValueError('This version supports mobile-number PromptPay QR codes only')
        if any(key in account for key in ('02','03','04')):
            raise ValueError('Ambiguous PromptPay recipient')
        return normalize_mobile(mobile)
    except (KeyError, ValueError) as exc:
        raise ValueError('Upload a valid Thai mobile-number PromptPay QR. National ID, bank-account and bill-payment QR codes are not supported.') from exc
