/**
 * Footer component.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { FiTruck } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <FiTruck className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">SkyBus</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              India's premium intercity bus service. Travel safely and comfortably across the country.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search" className="hover:text-white transition">Search Buses</Link></li>
              <li><Link to="/my-bookings" className="hover:text-white transition">My Bookings</Link></li>
              <li><a href="#" className="hover:text-white transition">Offers</a></li>
              <li><a href="#" className="hover:text-white transition">Track Bus</a></li>
            </ul>
          </div>

          {/* Popular Routes */}
          <div>
            <h3 className="text-white font-semibold mb-3">Popular Routes</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition">Chennai → Bangalore</a></li>
              <li><a href="#" className="hover:text-white transition">Mumbai → Pune</a></li>
              <li><a href="#" className="hover:text-white transition">Delhi → Jaipur</a></li>
              <li><a href="#" className="hover:text-white transition">Hyderabad → Vizag</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-3">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition">Cancellation Policy</a></li>
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
            </ul>
            <div className="mt-4">
              <p className="text-sm">📞 1800-123-SKYBUS (Toll Free)</p>
              <p className="text-sm">📧 support@skybus.in</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
          <p>© 2024 SkyBus Technologies Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
