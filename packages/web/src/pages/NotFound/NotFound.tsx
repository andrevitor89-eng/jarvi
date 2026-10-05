import { useNavigate } from 'react-router-dom';
import { Button, Logo } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import styles from './NotFound.module.css';

export function NotFound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const homeHref = user ? '/tasks' : '/login';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Logo />
        <h1 className={styles.title}>Página não encontrada</h1>
        <p className={styles.description}>
          Esse endereço não existe na Jarvi. Volte para continuar de onde parou.
        </p>
        <Button variant="primary" onClick={() => navigate(homeHref)}>
          {user ? 'Ir para tarefas' : 'Ir para o login'}
        </Button>
      </div>
    </div>
  );
}

export default NotFound;
