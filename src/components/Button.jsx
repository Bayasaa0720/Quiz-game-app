import './Button.css';

const VARIANT_CLASS = {
    primary: 'btn-primary',
    success: 'btn-success',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
};

export default function Button({ variant = 'primary', fullWidth = false, className = '', children, ...rest }) {
    const classes = [
        'btn',
        VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
        fullWidth ? 'btn-full' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <button className={classes} {...rest}>
            {children}
        </button>
    );
}
