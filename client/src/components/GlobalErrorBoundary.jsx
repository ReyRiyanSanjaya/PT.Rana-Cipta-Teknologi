import React from 'react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Global Error Boundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
                    <div className="max-w-xl w-full bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
                        <h1 className="text-2xl font-bold text-red-500 mb-4">Terjadi Kesalahan Aplikasi</h1>
                        <p className="text-slate-300 mb-6">
                            Mohon maaf, aplikasi mengalami kesalahan yang tidak terduga.
                            Silakan refresh halaman atau hubungi dukungan teknis jika masalah berlanjut.
                        </p>
                        
                        <div className="bg-slate-950 p-4 rounded-lg overflow-auto max-h-64 mb-6 border border-slate-800">
                            <code className="text-xs text-red-400 font-mono block mb-2">
                                {this.state.error && this.state.error.toString()}
                            </code>
                            <pre className="text-xs text-slate-500 font-mono">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors w-full"
                        >
                            Refresh Halaman
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
