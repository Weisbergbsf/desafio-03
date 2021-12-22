import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const index = cart.findIndex(pd => pd.id === productId);
      if (index >= 0) {
        const updateAmountProd = cart[index];
        const amount = updateAmountProd.amount + 1;
        await updateAmount({ productId, amount })

        return;
      }
      await addNewProduct(productId);

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const hasProduct = cart.some(prod => prod.id === productId);

      if (!hasProduct) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const newCart = cart.filter(prod => prod.id !== productId);
      setCart(newCart);
      setItemLocalStorage(newCart)
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      await updateAmount({ productId, amount })
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  const addNewProduct = async (productId: number) => {
    const product = await api.get<Product>(`/products/${productId}`).then(prod => prod.data);
    const newProduct = { ...product, amount: 1 };

    setCart(prevState => [...prevState, newProduct]);
    setItemLocalStorage([...cart, newProduct]);
  }

  const updateAmount = async ({ productId, amount }: UpdateProductAmount) => {
    const index = cart.findIndex(pd => pd.id === productId);

    if (index < 0 || amount < 1) {
      toast.error("Erro na alteração de quantidade do produto");
      return;
    }

    const stockAmount = await api.get<Stock>(`stock/${productId}`).then(stock => stock.data.amount);

    if (amount > stockAmount) {
      toast.error("Quantidade solicitada fora de estoque");
      return;
    }

    const newCart = cart.map(prod => {
      return prod.id === productId ? { ...prod, amount } : prod;
    });

    setCart(newCart)
    setItemLocalStorage(newCart)
  }

  const setItemLocalStorage = (value: Product[]) => {
    return localStorage.setItem('@RocketShoes:cart', JSON.stringify(value));
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
