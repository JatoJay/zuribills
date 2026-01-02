import { createContext } from 'react';
import { Service } from '@/types';

export interface CartItem extends Service {
    quantity: number;
}

export interface CartContextType {
    cart: CartItem[];
    addToCart: (service: Service) => void;
    removeFromCart: (serviceId: string) => void;
    updateQuantity: (serviceId: string, quantity: number) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    setIsCartOpen: (isOpen: boolean) => void;
}

export const CartContext = createContext<CartContextType>({
    cart: [],
    addToCart: () => { },
    removeFromCart: () => { },
    updateQuantity: () => { },
    clearCart: () => { },
    isCartOpen: false,
    setIsCartOpen: () => { },
});

