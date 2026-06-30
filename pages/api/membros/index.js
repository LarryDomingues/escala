// pages/api/membros/index.js - Verificar parte do GET
if (req.method === 'GET') {
  try {
    const membros = await Membro.find()
      .populate('usuario_id', 'nome email')
      .populate('habilidade_ids', 'nome')
      .sort({ nome: 1 });

    const result = membros.map(membro => {
      const membroObj = membro.toObject ? membro.toObject() : membro;
      return {
        id: membroObj._id || membroObj.id,
        nome: membroObj.nome,
        celular: membroObj.celular || '',
        email: membroObj.email || '',
        data_nascimento: membroObj.data_nascimento || '',
        usuario_id: membroObj.usuario_id?._id || membroObj.usuario_id || null,
        usuario_sistema: membroObj.usuario_id?.nome || 'Sem usuário',
        habilidades: membroObj.habilidade_ids?.map(h => h.nome).join(', ') || '',
        habilidade_ids: membroObj.habilidade_ids?.map(h => h._id?.toString() || h.toString()) || [],
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao buscar membros:', error);
    return res.status(500).json({ error: 'Erro ao buscar membros' });
  }
}