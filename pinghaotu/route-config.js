// 路线配置文件
// 当添加新的图片时，只需要在这个文件中添加相应的配置即可

window.RouteConfig = {
    // 图片配置
    imageData: {
        '+6': ['+61 nt.jpg', '+62 md.jpg', '+63 ly.jpg', '+64 ly.jpg', '+65 ly.jpg', '+66 ly.jpg', '+67 ly.jpg', '+68 ly.jpg', '+69 ly.jpg', '+610 ly.jpg', '+611 ly.jpg', '+612 ly.jpg', '+613 ly.jpg', '+614 xm.jpg', '+615 xm.jpg', '+616 sm.jpg', '+617 sm.jpg', '+618 sm.jpg', '+619 sm.jpg', '+620 sm.jpg', '+621 sm.jpg', '+622 sm.jpg', '+623 sm.jpg', '+624 sm.jpg', '+625 sm.jpg', '+626 xm.jpg', '+627 ly.jpg', '+628 ly.jpg', '+629 ly.jpg', '+630 ly.jpg', '+631 dq.jpg', '+632 dq.jpg', '+633 dq.jpg', '+634 dq.jpg', '+635 dq.jpg', '+636 fd.jpg', '+637 fd.jpg', '+638 fd.jpg', '+639 fd.jpg', '+640 fd.jpg', '+641 fd.jpg', '+642 fd.jpg', '+643 cy.jpg', '+644 cy.jpg', '+645 cy.jpg', '+646 cy.jpg', '+647 cy.jpg', '+648 yxg.jpg', '+649 yxg.jpg'],
        'JTY': ['JTY1 md.jpg', 'JTY2 md.jpg', 'JTY3 md.jpg', 'JTY4 ly.jpg', 'JTY5 dq.jpg'],
        'RXM': ['RXM1 nt.jpg', 'RXM2 nt.jpg', 'RXM3 nt.jpg'],
        'y7': ['y71 yxg.jpg', 'y72 yxg.jpg', 'y73 yxg.jpg', 'y74 yxg.jpg', 'y75 yxg.jpg', 'y76 yxg.jpg', 'y77 cy.jpg', 'y78 cy.jpg', 'y79 cy.jpg', 'y710 cy.jpg', 'y711 cy.jpg', 'y712 cy.jpg', 'y713 fd.jpg', 'y714 fd.jpg', 'y715 fd.jpg', 'y716 fd.jpg', 'y717 fd.jpg', 'y718 fd.jpg', 'y719 fd.jpg', 'y720 fd.jpg', 'y721 ly.jpg', 'y722 ly.jpg', 'y723 ly.jpg', 'y724 ly.jpg', 'y725 ly.jpg', 'y726 ly.jpg', 'y727 xm.jpg', 'y728 sm.jpg', 'y729 sm.jpg', 'y730 xm.jpg', 'y731 sm.jpg', 'y732 sm.jpg', 'y733 sm.jpg', 'y734 sm.jpg', 'y735 dq.jpg', 'y736 dq.jpg', 'y737 dq.jpg', 'y738 dq.jpg', 'y739 dq.jpg', 'y740 dq.jpg', 'y741 nt.jpg', 'y742 nt.jpg', 'y743 nt.jpg', 'y744 nt.jpg', 'y745 nt.jpg', 'y746 nt.jpg'],
        '传奇': ['传奇1 fd.jpg', '传奇2 fd.jpg', '传奇3 fd.jpg', '传奇4 fd.jpg'],
        '发条': ['发条1 fd.jpg', '发条2 fd.jpg', '发条3 fd.jpg', '发条4 fd.jpg'],
        '小怪A': ['小怪A1 yxg.jpg', '小怪A2 yxg.jpg', '小怪A3 yxg.jpg', '小怪A4 md.jpg', '小怪A5 md.jpg', '小怪A6 md.jpg', '小怪A7 md.jpg', '小怪A8 md.jpg', '小怪A9 md.jpg'],
        '役人': ['役人1 fd.jpg', '役人2 fd.jpg', '役人3 fd.jpg'],
        '愚人众': ['愚人众1 md.jpg', '愚人众2 md.jpg', '愚人众3 ly.jpg', '愚人众4 ly.jpg', '愚人众5 ly.jpg', '愚人众6 ly.jpg'],
        '杂': ['杂1 dq.jpg', '杂2 dq.jpg', '杂3 dq.jpg', '杂4 dq.jpg'],
        '次数盾': ['次数盾1 nt.jpg'],
        '游龙圣': ['游龙圣1 sm.jpg', '游龙圣2 sm.jpg', '游龙圣3 sm.jpg', '游龙圣4 sm.jpg', '游龙圣5 sm.jpg'],
        '漂浮灵': ['漂浮灵1 dq.jpg', '漂浮灵2 xm.jpg', '漂浮灵3 dq.jpg'],
        '盗宝团': ['盗宝团1 cy.jpg', '盗宝团2 cy.jpg', '盗宝团3 cy.jpg', '盗宝团4 ly.jpg', '盗宝团5 fd.jpg'],
        '矿': ['矿1 fd.jpg', '矿2 fd.jpg', '矿3 cy.jpg', '矿4 cy.jpg'],
        '肉': ['肉1 md.jpg', '肉2 sm.jpg', '肉3 sm.jpg', '肉4 sm.jpg', '肉5 xm.jpg', '肉6 xm.jpg'],
        '蕈兽': ['蕈兽1 xm.jpg', '蕈兽2 xm.jpg', '蕈兽3 xm.jpg', '蕈兽4 sm.jpg'],
        '镀金旅团': ['镀金旅团1 xm.jpg', '镀金旅团2 xm.jpg', '镀金旅团3 xm.jpg', '镀金旅团4 xm.jpg', '镀金旅团5 xm.jpg', '镀金旅团6 xm.jpg', '镀金旅团7 sm.jpg'],
        '骗骗花': ['骗骗花1 ly.jpg', '骗骗花2 dq.jpg', '骗骗花3 fd.jpg', '骗骗花4 fd.jpg', '骗骗花5 xm.jpg'],
        '龙哨': ['龙哨1 nt.jpg', '龙哨2 nt.jpg', '龙哨3 nt.jpg', '龙哨4 nt.jpg'],
    },
    
    // 地区代码映射
    regionMapping: {
        'md': '蒙德',
        'ly': '璃月',
        'dq': '稻妻',
        'xm': '须弥',
        'fd': '枫丹',
        'nt': '纳塔',
        'cy': '层岩',
        'yxg': '渊下宫',
        'sm': '沙漠',
        'jr': '旧日之海',
        'ss': '远古圣山',
    }
};
