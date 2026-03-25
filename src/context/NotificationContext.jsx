import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Bell, Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

const NotificationContext = createContext();

export const useNotifications = () => {
   return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
   const { profile } = useAuth();
   const [notifications, setNotifications] = useState([]);
   const [unreadCount, setUnreadCount] = useState(0);
   const [toasts, setToasts] = useState([]);

   const loadNotifications = async () => {
      if (!profile) return;
      const { data } = await supabase
         .from('notifications')
         .select('*')
         .eq('user_id', profile.id)
         .order('created_at', { ascending: false })
         .limit(50);
      
      if (data) {
         setNotifications(data);
         setUnreadCount(data.filter(n => !n.is_read).length);
      }
   };

   useEffect(() => {
      loadNotifications();

      if (!profile) return;

      const channel = supabase.channel(`notifications_${profile.id}`)
         .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
            (payload) => {
               const newNotif = payload.new;
               setNotifications(prev => [newNotif, ...prev]);
               setUnreadCount(prev => prev + 1);
               showToast(newNotif);
            }
         )
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, [profile]);

   const showToast = (notif) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { ...notif, toastId: id }]);
      setTimeout(() => {
         setToasts(prev => prev.filter(t => t.toastId !== id));
      }, 5000); // Hide toast after 5 seconds
   };

   const removeToast = (id) => {
      setToasts(prev => prev.filter(t => t.toastId !== id));
   };

   const markAsRead = async (id) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
   };

   const markAllAsRead = async () => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
   };

   const getIcon = (type, size = 18) => {
      switch (type) {
         case 'success': return <CheckCircle size={size} color="var(--green)" />;
         case 'warning': return <AlertTriangle size={size} color="var(--amber)" />;
         case 'error': return <XCircle size={size} color="var(--red)" />;
         default: return <Info size={size} color="var(--blue)" />;
      }
   };

   return (
      <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, getIcon }}>
         {children}
         
         {/* Toast Container */}
         <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
         }}>
            {toasts.map(t => (
               <div key={t.toastId} style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-xl)',
                  borderRadius: 'var(--radius)',
                  padding: 16,
                  width: 320,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  animation: 'slideInRight 0.3s ease-out forwards',
                  position: 'relative'
               }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>{getIcon(t.type, 20)}</div>
                  <div style={{ flex: 1 }}>
                     <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800 }}>{t.title}</h4>
                     <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--text-2)' }}>{t.message}</p>
                  </div>
                  <button 
                     onClick={() => removeToast(t.toastId)}
                     style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
                  >
                     <X size={14} />
                  </button>
               </div>
            ))}
         </div>
      </NotificationContext.Provider>
   );
};
