'use client';

/**
 * Demo component showing how to use the extension safety system
 * This component can be used to test and demonstrate extension compatibility
 */

import React, { useState } from 'react';
import ExtensionSafeWrapper from './ExtensionSafeWrapper';
import {
  ExtensionSafeInput,
  ExtensionSafeForm,
  ExtensionSafeTextArea,
  ExtensionProtectedSection
} from './ExtensionSafeComponents';
import { useBrowserExtensions } from '@/hooks/useBrowserExtensions';
import { ExtensionDetection } from '@/types/extensions';

export default function ExtensionCompatibilityDemo() {
  const { extensions, hasExtensions, isClient } = useBrowserExtensions();
  const [formData, setFormData] = useState({
    email: '',
    message: '',
    preference: ''
  });

  const handleExtensionDetected = (detectedExtensions: ExtensionDetection) => {
    console.log('Extensions detected in demo:', detectedExtensions);
  };

  if (!isClient) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Browser Extension Compatibility Demo
        </h2>

        {/* Extension Detection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Detection Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className={`flex items-center gap-2 ${extensions.darkReader ? 'text-orange-600' : 'text-green-600'}`}>
                <div className={`w-3 h-3 rounded-full ${extensions.darkReader ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                <span>DarkReader: {extensions.darkReader ? 'Detected' : 'Not detected'}</span>
              </div>

              <div className={`flex items-center gap-2 ${extensions.grammarly ? 'text-red-600' : 'text-green-600'}`}>
                <div className={`w-3 h-3 rounded-full ${extensions.grammarly ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span>Grammarly: {extensions.grammarly ? 'Detected' : 'Not detected'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className={`flex items-center gap-2 ${extensions.passwordManager ? 'text-orange-600' : 'text-green-600'}`}>
                <div className={`w-3 h-3 rounded-full ${extensions.passwordManager ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                <span>Password Manager: {extensions.passwordManager ? 'Detected' : 'Not detected'}</span>
              </div>

              <div className={`flex items-center gap-2 ${extensions.adBlocker ? 'text-blue-600' : 'text-green-600'}`}>
                <div className={`w-3 h-3 rounded-full ${extensions.adBlocker ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                <span>Ad Blocker: {extensions.adBlocker ? 'Detected' : 'Not detected'}</span>
              </div>
            </div>
          </div>

          {extensions.other.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Other extensions detected:</strong> {extensions.other.join(', ')}
              </p>
            </div>
          )}

          {!hasExtensions && (
            <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
              <p className="text-sm text-green-800">
                No problematic extensions detected! The app should render normally.
              </p>
            </div>
          )}
        </div>

        {/* Demo Form - Extension Safe */}
        <ExtensionSafeForm
          className="space-y-4"
          onExtensionDetected={handleExtensionDetected}
        >
          <h3 className="text-lg font-semibold text-gray-800">Extension-Safe Form Demo</h3>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address (Password managers may affect this)
            </label>
            <ExtensionSafeInput
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@example.com"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message (Grammarly may enhance this)
            </label>
            <ExtensionSafeTextArea
              id="message"
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Type your message here..."
            />
          </div>

          <div>
            <label htmlFor="preference" className="block text-sm font-medium text-gray-700 mb-1">
              Preference
            </label>
            <select
              id="preference"
              value={formData.preference}
              onChange={(e) => setFormData({ ...formData, preference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a preference</option>
              <option value="email">Email notifications</option>
              <option value="sms">SMS notifications</option>
              <option value="none">No notifications</option>
            </select>
          </div>
        </ExtensionSafeForm>

        {/* Protected Content Section */}
        <ExtensionProtectedSection
          className="mt-8"
          protectionLevel="maximum"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Protected Content</h3>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800">
              This content is protected from extension modifications. It uses maximum protection
              level and will show a fallback if extensions interfere with rendering.
            </p>
          </div>
        </ExtensionProtectedSection>

        {/* Regular vs Extension-Safe Comparison */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Regular Components</h4>
            <div className="space-y-3 p-4 border border-gray-200 rounded">
              <input
                type="text"
                placeholder="Regular input (may have extension issues)"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              <textarea
                placeholder="Regular textarea (Grammarly affects this)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Extension-Safe Components</h4>
            <ExtensionSafeWrapper className="space-y-3 p-4 border border-green-200 rounded">
              <ExtensionSafeInput
                type="text"
                placeholder="Extension-safe input"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              <ExtensionSafeTextArea
                placeholder="Extension-safe textarea"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </ExtensionSafeWrapper>
          </div>
        </div>

        {/* Usage Guide */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Usage Guide</h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700">1. Basic Wrapper</h4>
              <code className="block bg-white p-2 rounded border text-xs mt-1">
                {`<ExtensionSafeWrapper>
  <YourComponent />
</ExtensionSafeWrapper>`}
              </code>
            </div>

            <div>
              <h4 className="font-medium text-gray-700">2. Forms and Inputs</h4>
              <code className="block bg-white p-2 rounded border text-xs mt-1">
                {`<ExtensionSafeForm>
  <ExtensionSafeInput type="email" />
  <ExtensionSafeTextArea />
</ExtensionSafeForm>`}
              </code>
            </div>

            <div>
              <h4 className="font-medium text-gray-700">3. Charts and Interactive Content</h4>
              <code className="block bg-white p-2 rounded border text-xs mt-1">
                {`<ExtensionSafeChartContainer>
  <YourChartComponent />
</ExtensionSafeChartContainer>`}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}