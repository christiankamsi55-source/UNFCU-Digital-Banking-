import React, { useState } from 'react';
import {
  X,
  Layers,
  Smartphone,
  Laptop,
  Cloud,
  Database,
  Terminal,
  CheckCircle2,
  ExternalLink,
  Shield,
  Apple,
} from 'lucide-react';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'web' | 'android' | 'ios' | 'laptop'>(
    'overview'
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#173A52] text-white p-5 flex items-center justify-between border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">
                Distribution & Deployment Guide
              </h3>
              <p className="text-blue-200/80 text-xs">
                Unified Backend Architecture · Web · Android APK · iOS IPA · Laptop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 flex gap-2 overflow-x-auto text-xs font-semibold py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-[#173A52] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Architecture Overview
          </button>
          <button
            onClick={() => setActiveTab('web')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'web'
                ? 'bg-white text-[#173A52] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Web & Cloud Hosting
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-[#173A52] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            3. Android APK Build
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-[#173A52] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#2166D5]" />
            4. iOS Xcode Build
          </button>
          <button
            onClick={() => setActiveTab('laptop')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'laptop'
                ? 'bg-white text-[#173A52] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-slate-700" />
            5. Laptop Distribution
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#EBF2FC] border border-[#2166D5]/25 rounded-xl">
                <h4 className="font-bold text-sm text-[#173A52] mb-1">
                  Unified Shared Backend & Multi-Platform Strategy
                </h4>
                <p className="text-slate-700">
                  Both the Web portal and mobile/laptop builds communicate with the same shared backend and persistent database. This guarantees that user balances, transfer requests, and administrator adjustments synchronize seamlessly across devices.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-[#2166D5]" />
                    Persistent Storage Engine
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Built with atomic file transaction locking and in-memory synchronization in <code className="bg-white px-1 py-0.5 rounded border border-slate-200">data/database.json</code>. Easily scales to PostgreSQL or Cloud SQL with zero frontend code changes.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    Security & RBAC Enforcement
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Administrator permissions are strictly bound to the server-configured administrative account with PBKDF2 password hashing and 15-minute secondary Reset protection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'web' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900">
                Deploying Web Application to Public HTTPS
              </h4>
              <p>
                The application runs a unified full-stack Node.js + Express + Vite server that can be deployed to Google Cloud Run, Railway, Render, or Docker with automatic HTTPS SSL certificates.
              </p>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] space-y-2">
                <div className="text-slate-400"># 1. Build client and server bundles:</div>
                <div className="text-amber-300">npm run build</div>
                <div className="text-slate-400 pt-2"># 2. Start production server on port 3000:</div>
                <div className="text-amber-300">npm start</div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-900 block text-xs">Required Environment Variables:</span>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
                  <li><code className="font-semibold text-slate-900">PORT</code>: 3000 (standard container runtime port)</li>
                  <li><code className="font-semibold text-slate-900">NODE_ENV</code>: production</li>
                  <li><code className="font-semibold text-slate-900">ADMIN_EMAIL</code>: [Configured Admin Email in server .env]</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Building Native Android APK / App Bundle (Capacitor)
              </h4>
              <p>
                The mobile app frontend is fully optimized for touch, safe area insets, and responsive viewports. Use Capacitor to package into a native Android APK:
              </p>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] space-y-1.5">
                <div className="text-slate-400"># 1. Install Capacitor CLI & Android platform</div>
                <div className="text-amber-300">npm install @capacitor/core @capacitor/cli @capacitor/android</div>
                <div className="text-slate-400 pt-2"># 2. Initialize Capacitor project</div>
                <div className="text-blue-200">npx cap init "UNFCU Digital Banking" "bank.ungoldchase.app"</div>
                <div className="text-slate-400 pt-2"># 3. Build web assets and sync to native Android project</div>
                <div className="text-amber-300">npm run build && npx cap add android && npx cap sync android</div>
                <div className="text-slate-400 pt-2"># 4. Open in Android Studio & generate signed APK/AAB</div>
                <div className="text-amber-300">npx cap open android</div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-blue-900 text-[11px]">
                <strong>Physical Device Testing:</strong> Enable Developer Options and USB Debugging on your Android phone, then click "Run 'app'" in Android Studio to test on device.
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                Building iOS App (Xcode / TestFlight)
              </h4>
              <p>
                Follow the standard Capacitor iOS pipeline to bundle for iPhone and iPad:
              </p>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] space-y-1.5">
                <div className="text-slate-400"># 1. Add iOS platform</div>
                <div className="text-amber-300">npm install @capacitor/ios && npx cap add ios</div>
                <div className="text-slate-400 pt-2"># 2. Sync web bundle to iOS workspace</div>
                <div className="text-amber-300">npm run build && npx cap sync ios</div>
                <div className="text-slate-400 pt-2"># 3. Open in Xcode (requires macOS)</div>
                <div className="text-amber-300">npx cap open ios</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[11px] text-slate-600">
                <strong>Prerequisites:</strong> Apple Developer Account ($99/yr) is required for TestFlight or App Store distribution. Local testing on connected iPhone via USB requires free Apple ID signing.
              </div>
            </div>
          )}

          {activeTab === 'laptop' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-slate-800" />
                Building Laptop / Desktop Applications (Windows & Mac)
              </h4>
              <p>
                The digital wallet can be distributed as a standalone desktop executable using Electron or as an installable Progressive Web App (PWA):
              </p>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-900 text-xs">Method A: Progressive Web App (PWA)</div>
                <p className="text-[11px] text-slate-600">
                  Users on Windows, macOS, and Linux can open the public web URL in Chrome, Edge, or Safari and click the "Install App" button in the address bar to run the wallet in a dedicated standalone window with desktop shortcuts.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-900 text-xs">Method B: Standalone Electron Installer (.exe / .dmg)</div>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] space-y-1">
                  <div>npm install --save-dev electron electron-builder</div>
                  <div className="text-amber-300">npx electron-builder --win --mac</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
