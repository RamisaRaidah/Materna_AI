import logging
from db import query

logger = logging.getLogger("sms_simulation")

def send_simulated_sms(recipient_phone, body):
    """
    Simulates sending an SMS message.
    Logs the message to standard output and inserts a record in the database.
    """
    print("\n" + "="*60)
    print(" [SMS OUTBOUND SIMULATION]")
    print(f" To:      {recipient_phone}")
    print(f" Message: {body}")
    print("="*60 + "\n")
    
    try:
        # Insert log into the database
        query("""
            INSERT INTO sms_logs (recipient_phone, body, status)
            VALUES (%s, %s, %s)
        """, (recipient_phone, body, 'sent'), fetch="none")
    except Exception as e:
        logger.error(f"Failed to save SMS log: {e}")
        
    return True
