import { useEffect } from 'react';

const ensureMetaTag = (name, selector) => {
    let tag = document.querySelector(selector);
    if (!tag) {
        tag = document.createElement('meta');
        if (name === 'description') tag.name = 'description';
        document.head.appendChild(tag);
    }
    return tag;
};

const usePageMeta = ({ title, description }) => {
    useEffect(() => {
        if (typeof document === 'undefined') return;
        if (title) {
            document.title = title;
        }
        if (description) {
            const meta = ensureMetaTag('description', 'meta[name="description"]');
            meta.setAttribute('content', description);
        }
    }, [title, description]);
};

export default usePageMeta;

