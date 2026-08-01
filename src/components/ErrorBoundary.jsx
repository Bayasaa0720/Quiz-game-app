import { Component } from 'react';
import Button from './Button.jsx';
import './ErrorBoundary.css';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('Unhandled UI error:', error, info);
    }

    handleReload = () => {
        this.setState({ hasError: false });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <h2>😕 Ямар нэг зүйл буруу боллоо</h2>
                    <p>Апп-д гэнэтийн алдаа гарлаа. Нүүр хуудас руу буцаж дахин оролдоно уу.</p>
                    <Button onClick={this.handleReload}>Нүүр хуудас руу буцах</Button>
                </div>
            );
        }
        return this.props.children;
    }
}
