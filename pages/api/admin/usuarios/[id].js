import connectDB from '../../../../lib/mongodb';
import Usuario from '../../../../lib/models/Usuario';
import Membro from '../../../../lib/models/Membro';
import Log from '../../../../lib/models/Log';
import { getUserFromToken } from '../../../../lib/auth';

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (user.nivel !== 'admin') {
    return res.status(403).json({ error: 'Sem permissão. Apenas administradores podem acessar.' });
  }

  await connectDB();

  const { id } = req.query;

  // PUT - Atualizar usuário
  if (req.method === 'PUT') {
    try {
      const { acao, nivel, vincular_membro, desvincular_membro } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório' });
      }

      const usuario = await Usuario.findById(id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      let descricao = '';
      let membroVinculado = null;

      // Vincular a um membro
      if (vincular_membro) {
        const membro = await Membro.findById(vincular_membro);
        if (!membro) {
          return res.status(404).json({ error: 'Membro não encontrado' });
        }

        // Verificar se o membro já está vinculado a outro usuário
        const membroExistente = await Membro.findOne({ 
          _id: vincular_membro,
          usuario_id: { $ne: null }
        });
        
        if (membroExistente) {
          return res.status(400).json({ error: 'Este membro já está vinculado a outro usuário' });
        }

        // Verificar se o usuário já tem um membro vinculado
        const membroAtual = await Membro.findOne({ usuario_id: id });
        if (membroAtual) {
          membroAtual.usuario_id = null;
          await membroAtual.save();
        }
        
        // Vincular ao novo membro
        membro.usuario_id = id;
        await membro.save();
        membroVinculado = membro;
        descricao = `Usuário ${usuario.nome} vinculado ao membro ${membro.nome}`;
      }

      // Desvincular
      if (desvincular_membro) {
        const membro = await Membro.findOne({ usuario_id: id });
        if (membro) {
          membro.usuario_id = null;
          await membro.save();
          descricao = `Usuário ${usuario.nome} desvinculado do membro ${membro.nome}`;
        } else {
          return res.status(404).json({ error: 'Nenhum membro vinculado a este usuário' });
        }
      }

      // Ações de status
      if (acao && id !== user.id) {
        const statusMap = {
          ativar: 'ativo',
          bloquear: 'bloqueado',
          desbloquear: 'ativo',
        };
        if (statusMap[acao]) {
          usuario.status = statusMap[acao];
          descricao = descricao || `Usuário ${usuario.nome} foi ${acao}do`;
          await usuario.save();
        }
      }

      // Mudar nível
      if (nivel && id !== user.id) {
        if (!['membro', 'coordenador', 'admin'].includes(nivel)) {
          return res.status(400).json({ error: 'Nível inválido' });
        }
        usuario.nivel = nivel;
        descricao = descricao || `Usuário ${usuario.nome} foi alterado para ${nivel}`;
        await usuario.save();
      }

      // Se não houve nenhuma ação, retornar erro
      if (!descricao) {
        return res.status(400).json({ error: 'Nenhuma ação foi realizada' });
      }

      await Log.create({
        usuario_id: user.id,
        acao: 'admin_usuarios',
        descricao: `${descricao} por ${user.nome}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
      });

      // Retornar os dados atualizados
      const membroAtualizado = await Membro.findOne({ usuario_id: id }).select('_id nome');

      return res.status(200).json({
        success: true,
        message: 'Usuário atualizado com sucesso!',
        membro: membroAtualizado ? {
          id: membroAtualizado._id,
          nome: membroAtualizado.nome,
        } : null,
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  // DELETE - Deletar usuário
  if (req.method === 'DELETE') {
    try {
      if (!id || id === user.id) {
        return res.status(400).json({ error: 'Não é possível deletar o próprio usuário' });
      }

      const usuario = await Usuario.findById(id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (usuario.nivel === 'admin') {
        return res.status(400).json({ error: 'Não é possível deletar um administrador' });
      }

      const nomeUsuario = usuario.nome;

      // Remover referência do membro se existir
      await Membro.updateMany({ usuario_id: id }, { usuario_id: null });

      // Deletar o usuário
      await Usuario.findByIdAndDelete(id);

      await Log.create({
        usuario_id: user.id,
        acao: 'deletar_usuario',
        descricao: `Usuário ${nomeUsuario} deletado por ${user.nome}`,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
      });

      return res.status(200).json({
        success: true,
        message: `Usuário ${nomeUsuario} deletado com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      return res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}