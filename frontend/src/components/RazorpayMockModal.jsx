import React, { useState } from 'react';
import { X, CreditCard, Smartphone, Building2, Wallet } from 'lucide-react';

// Mock secret to generate signature on the frontend (simulating what the real Razorpay backend does for the client)
const RAZORPAY_MOCK_SECRET = 'mock_secret_key_12345';

async function generateSignature(orderId, paymentId, secret) {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await window.crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(orderId + "|" + paymentId)
  );
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function RazorpayMockModal({ order, onSuccess, onClose }) {
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);

  // amount is in paise, convert to rupees for display
  const amountInRupees = order.amount ? (order.amount / 100).toFixed(2) : '0.00';

  const handlePay = async () => {
    setIsProcessing(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock payment ID
    const randomHex = Array.from(window.crypto.getRandomValues(new Uint8Array(6)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const paymentId = `pay_mock_${randomHex}`;

    // Generate signature
    const signature = await generateSignature(order.id, paymentId, RAZORPAY_MOCK_SECRET);

    onSuccess({
      razorpay_order_id: order.id,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#02042b] text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-[#02042b]">
              MG
            </div>
            <div>
              <h2 className="font-semibold text-lg">Mana Grocery</h2>
              <p className="text-sm text-white/70">Order {order.id}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-end border-t border-white/20 pt-4">
            <span className="text-white/80">Amount to pay</span>
            <span className="text-2xl font-bold">₹{amountInRupees}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <h3 className="font-medium text-gray-700 mb-4">Select Payment Method</h3>
          
          <div className="space-y-3">
            {[
              { id: 'card', icon: CreditCard, label: 'Cards (Credit/Debit)' },
              { id: 'upi', icon: Smartphone, label: 'UPI (GPay, PhonePe)' },
              { id: 'netbanking', icon: Building2, label: 'Netbanking' },
              { id: 'wallet', icon: Wallet, label: 'Wallets' }
            ].map(method => (
              <label 
                key={method.id} 
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedMethod === method.id 
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input 
                  type="radio" 
                  name="payment_method" 
                  value={method.id}
                  checked={selectedMethod === method.id}
                  onChange={() => setSelectedMethod(method.id)}
                  className="hidden"
                />
                <method.icon className={`w-5 h-5 mr-3 ${selectedMethod === method.id ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className={`font-medium ${selectedMethod === method.id ? 'text-blue-900' : 'text-gray-700'}`}>
                  {method.label}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={handlePay}
            disabled={isProcessing}
            className={`w-full mt-6 py-4 rounded-lg font-bold text-white shadow-lg transition-all ${
              isProcessing 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl active:scale-[0.98]'
            }`}
          >
            {isProcessing ? 'Processing...' : `Pay ₹${amountInRupees}`}
          </button>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-500 border-t border-gray-100">
          MockGateway - Testing Environment
        </div>
      </div>
    </div>
  );
}
